'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuTrophy, LuClock, LuHeart, LuCheck, LuX } from 'react-icons/lu';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { apiUrl } from '@/lib/api';

type Checkpoint = { position: number; papel_reward: number; label: string | null };

type MyState = {
  wrong_count: number;
  total_correct: number;
  last_position: number;
  eliminated_at: string | null;
  papel_earned: number;
  perfect_score: boolean;
};

type EventCard = {
  id: string;
  scope: 'global' | 'guild';
  guild_id: string | null;
  lang?: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  total_questions: number;
  seconds_per_question: number;
  reveal_seconds: number;
  wrong_allowed: number;
  prize_pool_papel: number;
  status: 'scheduled' | 'live' | 'finished' | 'cancelled';
  current_position: number;
  current_question_started_at: string | null;
  questions_locked_at?: string | null;
  checkpoints: Checkpoint[];
  me: MyState | null;
};

type StateResponse = {
  event: EventCard;
  current_question: {
    position: number;
    question_text: string;
    options: string[];
    category: string | null;
    difficulty: string | null;
  } | null;
  answered_this_position: { selected_index: number | null; is_correct: boolean } | null;
  me: MyState | null;
  joined: boolean;
  can_join: boolean;
  registration_closed: boolean;
  start_pending?: boolean;
  start_blocked?: string | null;
  server_now: string;
};

function useCountdown(targetIso: string) {
  const [text, setText] = useState('');
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    const tick = () => {
      const ms = new Date(targetIso).getTime() - Date.now();
      if (ms <= 0) {
        setText('00:00');
        setEnded(true);
        return;
      }
      setEnded(false);
      const s = Math.floor(ms / 1000);
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      if (h > 0) setText(`${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`);
      else setText(`${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [targetIso]);

  return { text, ended };
}

export default function QuizEventSection() {
  const [events, setEvents] = useState<EventCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetchWithCreds(apiUrl('/api/member/quiz/active'), { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const list = (data.events ?? []) as EventCard[];
      setEvents(list);
      setSelectedId((prev) => {
        if (prev && list.find((e) => e.id === prev)) return prev;
        const live = list.find((e) => e.status === 'live');
        if (live) return live.id;
        const upcoming = list.find((e) => e.status === 'scheduled');
        if (upcoming) return upcoming.id;
        return list[0]?.id ?? null;
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    const onQuizEv = () => { void refresh(); };
    const onQuizPart = () => { void refresh(); };
    if (typeof window !== 'undefined') {
      window.addEventListener('quiz-event-update', onQuizEv);
      window.addEventListener('quiz-participant-update', onQuizPart);
    }
    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('quiz-event-update', onQuizEv);
        window.removeEventListener('quiz-participant-update', onQuizPart);
      }
    };
  }, [refresh]);

  const selected = useMemo(() => events.find((e) => e.id === selectedId) ?? null, [events, selectedId]);

  return (
    <div className="min-h-screen text-white">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <header className="mb-8 border-b border-white/10 pb-6">
          <p className="text-xs font-medium uppercase tracking-widest text-white/40">Etkinlik</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Quiz</h1>
        </header>

        {loading && <p className="py-12 text-center text-sm text-white/40">Yükleniyor…</p>}

        {error && !loading && (
          <p className="py-8 text-center text-sm text-red-400/90">{error}</p>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="py-16 text-center">
            <LuTrophy className="mx-auto h-8 w-8 text-white/20" strokeWidth={1.5} />
            <p className="mt-4 text-sm text-white/50">Yaklaşan veya aktif quiz etkinliği yok.</p>
          </div>
        )}

        {!loading && events.length > 1 && (
          <div className="mb-6 flex gap-1 border-b border-white/10">
            {events.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelectedId(e.id)}
                className={`border-b-2 px-3 py-2 text-sm transition ${
                  selectedId === e.id
                    ? 'border-white text-white'
                    : 'border-transparent text-white/45 hover:text-white/70'
                }`}
              >
                {e.title}
              </button>
            ))}
          </div>
        )}

        {selected && <EventPanel event={selected} onRefresh={refresh} />}
      </div>
    </div>
  );
}

function EventPanel({ event: initialEvent, onRefresh }: { event: EventCard; onRefresh: () => void }) {
  const [state, setState] = useState<StateResponse | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [answering, setAnswering] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<{ correctIndex: number; selected: number; isCorrect: boolean; position: number } | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const event: EventCard = state?.event
    ? {
        ...initialEvent,
        ...state.event,
        checkpoints: initialEvent.checkpoints ?? state.event.checkpoints ?? [],
        me: state.me ?? initialEvent.me ?? null,
      }
    : initialEvent;
  const isActive = event.status === 'scheduled' || event.status === 'live';
  const isOverdue =
    event.status === 'scheduled' && new Date(event.start_at).getTime() <= Date.now();

  const pollState = useCallback(async () => {
    try {
      const res = await fetchWithCreds(apiUrl(`/api/member/quiz/state?event_id=${initialEvent.id}`), { cache: 'no-store' });
      const data = (await res.json()) as StateResponse | { error: string };
      if ('error' in data) return;
      setState(data);
      if (data.current_question && data.current_question.position !== lastAnswer?.position) {
        setLastAnswer(null);
      }
      if (data.event.status !== 'scheduled') {
        onRefresh();
      }
    } catch {
      // ignore
    }
  }, [initialEvent.id, initialEvent.status, lastAnswer?.position, onRefresh]);

  useEffect(() => {
    if (!isActive) {
      setState(null);
      return;
    }
    pollState();
    const intervalMs = event.status === 'live' ? 2000 : isOverdue ? 1000 : 3000;
    pollRef.current = setInterval(pollState, intervalMs);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isActive, event.status, isOverdue, pollState]);

  const join = async () => {
    setJoining(true);
    setJoinError(null);
    try {
      const res = await fetchWithCreds(apiUrl('/api/member/quiz/join'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: initialEvent.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'registration_closed') {
          setJoinError('Kayıt süresi doldu. Etkinlik başladıktan sonra katılım mümkün değil.');
        } else {
          setJoinError(data.error || 'Katılım başarısız');
        }
        return;
      }
      await pollState();
      onRefresh();
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : 'Katılım başarısız');
    } finally {
      setJoining(false);
    }
  };

  const submit = async (idx: number) => {
    if (!state?.current_question) return;
    if (answering) return;
    setAnswering(true);
    try {
      const res = await fetchWithCreds(apiUrl('/api/member/quiz/answer'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: initialEvent.id,
          position: state.current_question.position,
          selected_index: idx,
        }),
      });
      const data = await res.json();
      if (!res.ok) return;
      setLastAnswer({
        correctIndex: data.correct_index,
        selected: idx,
        isCorrect: data.is_correct,
        position: state.current_question.position,
      });
      await pollState();
    } finally {
      setAnswering(false);
    }
  };

  if (event.status === 'finished' || event.status === 'cancelled') {
    return <FinishedView event={event} />;
  }

  if (event.status === 'scheduled') {
    return (
      <ScheduledView
        event={event}
        joined={state?.joined ?? !!event.me}
        canJoin={state?.can_join ?? !event.me}
        startPending={state?.start_pending ?? isOverdue}
        startBlocked={state?.start_blocked ?? null}
        onJoin={join}
        joining={joining}
        joinError={joinError}
        onCountdownEnd={pollState}
      />
    );
  }

  // live
  if (!state) {
    return <p className="py-12 text-center text-sm text-white/40">Bağlanılıyor…</p>;
  }

  if (state.registration_closed || !(state.joined ?? !!state.me)) {
    return <MissedRegistrationView event={event} />;
  }

  if (state.me?.eliminated_at) {
    return <EliminatedView event={state.event} me={state.me} />;
  }

  return (
    <LivePlayView
      state={state}
      onAnswer={submit}
      answering={answering}
      lastAnswer={lastAnswer}
    />
  );
}

function ScheduledView({
  event,
  joined,
  canJoin,
  startPending,
  startBlocked,
  onJoin,
  joining,
  joinError,
  onCountdownEnd,
}: {
  event: EventCard;
  joined: boolean;
  canJoin: boolean;
  startPending?: boolean;
  startBlocked?: string | null;
  onJoin: () => void;
  joining: boolean;
  joinError: string | null;
  onCountdownEnd?: () => void;
}) {
  const { text: countdown, ended } = useCountdown(event.start_at);
  const countdownFiredRef = useRef(false);
  const overdue = ended || startPending;

  useEffect(() => {
    if (ended && !countdownFiredRef.current) {
      countdownFiredRef.current = true;
      onCountdownEnd?.();
    }
  }, [ended, onCountdownEnd]);

  useEffect(() => {
    if (!overdue || startBlocked) return;
    const iv = setInterval(() => onCountdownEnd?.(), 2000);
    return () => clearInterval(iv);
  }, [overdue, startBlocked, onCountdownEnd]);

  return (
    <article>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-white/40">Yaklaşan</p>
          <h2 className="mt-1 text-xl font-semibold">{event.title}</h2>
          {event.description && <p className="mt-2 text-sm leading-relaxed text-white/55">{event.description}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] uppercase tracking-wider text-white/35">
            {overdue ? 'Durum' : 'Kalan süre'}
          </p>
          {overdue ? (
            startBlocked ? (
              <p className="mt-1 text-sm text-amber-400/90">Başlatılamadı</p>
            ) : (
              <p className="mt-1 text-sm text-white/70">Başlatılıyor…</p>
            )
          ) : (
            <p className="mt-1 font-mono text-3xl font-light tabular-nums tracking-tight">{countdown}</p>
          )}
        </div>
      </div>

      <dl className="mb-8 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-white/10 py-6 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-white/40">Başlangıç</dt>
          <dd className="mt-0.5 text-white/80">{new Date(event.start_at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</dd>
        </div>
        <div>
          <dt className="text-white/40">Soru</dt>
          <dd className="mt-0.5 text-white/80">{event.total_questions} × {event.seconds_per_question} sn</dd>
        </div>
        <div>
          <dt className="text-white/40">Hak</dt>
          <dd className="mt-0.5 text-white/80">{event.wrong_allowed} yanlış</dd>
        </div>
        <div>
          <dt className="text-white/40">Havuz</dt>
          <dd className="mt-0.5 text-white/80">{Number(event.prize_pool_papel).toLocaleString('tr-TR')} papel</dd>
        </div>
      </dl>

      {startBlocked && (
        <p className="mb-6 rounded border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-amber-200/90">
          {startBlocked}
        </p>
      )}

      {((event.checkpoints ?? []).length > 0) && (
        <div className="mb-8">
          <p className="mb-3 text-xs uppercase tracking-wider text-white/40">Checkpoint ödülleri</p>
          <ul className="space-y-2 text-sm">
            {(event.checkpoints ?? []).map((c) => (
              <li key={c.position} className="flex justify-between text-white/70">
                <span>Soru {c.position}{c.label ? ` — ${c.label}` : ''}</span>
                <span className="text-white/90">+{Number(c.papel_reward).toLocaleString('tr-TR')} papel</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-white/10 pt-6">
        {joined ? (
          <div className="flex items-center gap-2 text-sm text-white/70">
            <LuCheck className="h-4 w-4 shrink-0 text-white/50" />
            <span>Katıldın. Etkinlik başladığında sorular burada görünecek.</span>
          </div>
        ) : canJoin ? (
          <div>
            <p className="mb-4 text-sm text-white/55">
              Etkinlik başlamadan önce katılman gerekiyor. Geri sayım bittiğinde kayıt kapanır.
            </p>
            {joinError && <p className="mb-3 text-sm text-red-400/90">{joinError}</p>}
            <button
              onClick={onJoin}
              disabled={joining}
              className="w-full border border-white/20 bg-white py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:opacity-50"
            >
              {joining ? 'Kaydediliyor…' : 'Etkinliğe Katıl'}
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function MissedRegistrationView({ event }: { event: EventCard }) {
  return (
    <article className="py-8 text-center">
      <p className="text-xs uppercase tracking-wider text-white/40">Canlı</p>
      <h2 className="mt-2 text-xl font-semibold">{event.title}</h2>
      <p className="mx-auto mt-6 max-w-sm text-sm leading-relaxed text-white/50">
        Bu etkinliğe katılmadın. Sorular yalnızca etkinlik başlamadan önce kayıt olan üyelere gösterilir.
      </p>
      <p className="mt-4 text-xs text-white/35">
        Soru {event.current_position} / {event.total_questions}
      </p>
    </article>
  );
}

function LivePlayView({
  state,
  onAnswer,
  answering,
  lastAnswer,
}: {
  state: StateResponse;
  onAnswer: (idx: number) => void;
  answering: boolean;
  lastAnswer: { correctIndex: number; selected: number; isCorrect: boolean; position: number } | null;
}) {
  const { event, current_question: q, me, answered_this_position: answered } = state;
  const [secondsLeft, setSecondsLeft] = useState(event.seconds_per_question);

  useEffect(() => {
    if (!event.current_question_started_at) return;
    const update = () => {
      const elapsed = (Date.now() - new Date(event.current_question_started_at!).getTime()) / 1000;
      setSecondsLeft(Math.max(0, event.seconds_per_question - Math.floor(elapsed)));
    };
    update();
    const iv = setInterval(update, 250);
    return () => clearInterval(iv);
  }, [event.current_question_started_at, event.seconds_per_question]);

  const alreadyAnswered = !!answered || !!lastAnswer;
  const correctIdx = lastAnswer?.correctIndex ?? null;
  const livesLeft = event.wrong_allowed - (me?.wrong_count ?? 0);

  if (!q) {
    return (
      <article className="py-12 text-center">
        <p className="text-sm text-white/50">
          {!event.questions_locked_at
            ? 'Sorular hazırlanıyor…'
            : 'Soru yükleniyor…'}
        </p>
      </article>
    );
  }

  return (
    <article>
      <div className="mb-8 flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-baseline gap-3">
          <span className="text-xs uppercase tracking-wider text-white/40">Soru</span>
          <span className="font-mono text-lg tabular-nums">{q.position}<span className="text-white/35">/{event.total_questions}</span></span>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5">
            <LuClock className="h-3.5 w-3.5 text-white/40" strokeWidth={1.5} />
            <span className={`font-mono text-lg tabular-nums ${secondsLeft <= 5 ? 'text-white' : 'text-white/80'}`}>{secondsLeft}</span>
          </div>
          <div className="flex items-center gap-0.5">
            {Array.from({ length: event.wrong_allowed }).map((_, i) => (
              <LuHeart
                key={i}
                className={`h-3.5 w-3.5 ${i < livesLeft ? 'fill-white/70 text-white/70' : 'text-white/15'}`}
                strokeWidth={1.5}
              />
            ))}
          </div>
        </div>
      </div>

      {q.category && (
        <p className="mb-3 text-[11px] uppercase tracking-widest text-white/35">{q.category}</p>
      )}
      <h2 className="text-lg font-medium leading-snug text-white/95">{q.question_text}</h2>

      <div className="mt-8 space-y-2">
        {(q.options ?? []).map((opt, i) => {
          const isSelected = lastAnswer?.selected === i;
          const isCorrect = correctIdx === i;
          const showResult = alreadyAnswered && correctIdx !== null;
          return (
            <button
              key={i}
              onClick={() => onAnswer(i)}
              disabled={alreadyAnswered || answering || secondsLeft === 0}
              className={`flex w-full items-center gap-4 border px-4 py-3.5 text-left text-sm transition disabled:cursor-default ${
                showResult && isCorrect
                  ? 'border-white/40 bg-white/10 text-white'
                  : showResult && isSelected && !isCorrect
                    ? 'border-white/20 bg-white/5 text-white/60 line-through'
                    : alreadyAnswered
                      ? 'border-white/5 text-white/35'
                      : 'border-white/10 text-white/85 hover:border-white/25 hover:bg-white/[0.03]'
              }`}
            >
              <span className="w-5 shrink-0 font-mono text-xs text-white/40">{'ABCD'[i]}</span>
              <span className="flex-1">{opt}</span>
              {showResult && isCorrect && <LuCheck className="h-4 w-4 shrink-0" strokeWidth={1.5} />}
              {showResult && isSelected && !isCorrect && <LuX className="h-4 w-4 shrink-0 text-white/40" strokeWidth={1.5} />}
            </button>
          );
        })}
      </div>

      <footer className="mt-8 flex gap-6 border-t border-white/10 pt-4 text-xs text-white/45">
        <span>Doğru: <span className="text-white/75">{me?.total_correct ?? 0}</span></span>
        <span>Yanlış: <span className="text-white/75">{me?.wrong_count ?? 0}</span></span>
      </footer>
    </article>
  );
}

function EliminatedView({ event, me }: { event: EventCard; me: MyState }) {
  return (
    <article className="py-8 text-center">
      <p className="text-xs uppercase tracking-wider text-white/40">Elendin</p>
      <h2 className="mt-2 text-xl font-semibold">{event.title}</h2>
      <p className="mx-auto mt-4 max-w-sm text-sm text-white/50">
        {event.wrong_allowed} yanlış hakkını kullandın.
      </p>
      <dl className="mx-auto mt-8 grid max-w-xs grid-cols-3 gap-4 text-sm">
        <div>
          <dt className="text-white/40">Doğru</dt>
          <dd className="mt-1 text-lg tabular-nums">{me.total_correct}</dd>
        </div>
        <div>
          <dt className="text-white/40">Soru</dt>
          <dd className="mt-1 text-lg tabular-nums">{me.last_position}</dd>
        </div>
        <div>
          <dt className="text-white/40">Papel</dt>
          <dd className="mt-1 text-lg tabular-nums">{Number(me.papel_earned).toLocaleString('tr-TR')}</dd>
        </div>
      </dl>
    </article>
  );
}

function FinishedView({ event }: { event: EventCard }) {
  return (
    <article>
      <p className="text-xs uppercase tracking-wider text-white/40">
        {event.status === 'cancelled' ? 'İptal edildi' : 'Tamamlandı'}
      </p>
      <h2 className="mt-1 text-xl font-semibold">{event.title}</h2>
      {event.me ? (
        <dl className="mt-8 grid grid-cols-2 gap-6 border-t border-white/10 pt-6 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-white/40">Doğru</dt>
            <dd className="mt-1 text-lg tabular-nums">{event.me.total_correct} / {event.total_questions}</dd>
          </div>
          <div>
            <dt className="text-white/40">Yanlış</dt>
            <dd className="mt-1 text-lg tabular-nums">{event.me.wrong_count}</dd>
          </div>
          <div>
            <dt className="text-white/40">Mükemmel</dt>
            <dd className="mt-1">{event.me.perfect_score ? 'Evet' : 'Hayır'}</dd>
          </div>
          <div>
            <dt className="text-white/40">Papel</dt>
            <dd className="mt-1 text-lg tabular-nums">{Number(event.me.papel_earned).toLocaleString('tr-TR')}</dd>
          </div>
        </dl>
      ) : (
        <p className="mt-6 text-sm text-white/50">Bu etkinliğe katılmadın.</p>
      )}
    </article>
  );
}
