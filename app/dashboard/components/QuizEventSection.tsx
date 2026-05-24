'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LuTrophy,
  LuClock,
  LuHeart,
  LuCheck,
  LuX,
  LuFlag,
  LuCalendar,
  LuCoins,
  LuZap,
  LuCircleHelp,
} from 'react-icons/lu';
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

const CARD = 'rounded-2xl border border-white/[0.10] bg-white/[0.05] p-4 sm:p-5';
const INNER = 'rounded-xl border border-white/[0.06] bg-white/[0.02] p-3';

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

function StatusBadge({ live }: { live?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${live ? 'animate-pulse bg-emerald-400' : 'bg-sky-400'}`} />
      <span className="text-[11px] font-medium text-white/40">{live ? 'Canlı' : 'Yaklaşan'}</span>
    </span>
  );
}

function LoadingRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-12 text-white/30">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-white/40" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export default function QuizEventSection({ onQuizEnded }: { onQuizEnded?: () => void }) {
  const [events, setEvents] = useState<EventCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const hadLiveRef = useRef(false);

  const activeEvents = useMemo(
    () => events.filter((e) => e.status === 'scheduled' || e.status === 'live'),
    [events],
  );

  useEffect(() => {
    const isLive = events.some((e) => e.status === 'live');
    if (isLive) hadLiveRef.current = true;
    if (hadLiveRef.current && !isLive && activeEvents.length === 0) {
      onQuizEnded?.();
    }
  }, [events, activeEvents.length, onQuizEnded]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetchWithCreds(apiUrl('/api/member/quiz/active'), { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const list = (data.events ?? []) as EventCard[];
      setEvents(list);
      setSelectedId((prev) => {
        const active = list.filter((e) => e.status === 'scheduled' || e.status === 'live');
        if (prev && active.find((e) => e.id === prev)) return prev;
        const live = active.find((e) => e.status === 'live');
        if (live) return live.id;
        const upcoming = active.find((e) => e.status === 'scheduled');
        if (upcoming) return upcoming.id;
        return active[0]?.id ?? null;
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

  const selected = useMemo(
    () => activeEvents.find((e) => e.id === selectedId) ?? null,
    [activeEvents, selectedId],
  );

  return (
    <section className="flex flex-col gap-3 pt-4 pb-4 px-4 sm:pt-5 sm:pb-5 sm:px-5">
      <div>
        <p className="text-xs font-medium text-white/30 mb-0.5">Etkinlik</p>
        <h1 className="text-2xl font-black text-white tracking-tight">Quiz</h1>
        <p className="mt-1 text-sm text-white/40">Doğru cevapla, ödül havuzundan papel kazan.</p>
      </div>

      {loading && <LoadingRow label="Yükleniyor…" />}

      {error && !loading && (
        <div className={`${CARD} border-rose-500/20 bg-rose-500/5`}>
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      )}

      {!loading && !error && activeEvents.length === 0 && !hadLiveRef.current && (
        <div className={`${CARD} py-12 text-center`}>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
            <LuTrophy className="h-5 w-5 text-white/25" strokeWidth={1.5} />
          </div>
          <p className="mt-4 text-sm text-white/50">Yaklaşan veya aktif quiz etkinliği yok.</p>
          <p className="mt-1 text-xs text-white/30">Yeni etkinlikler duyurulduğunda burada görünecek.</p>
        </div>
      )}

      {!loading && activeEvents.length > 1 && (
        <div className="flex flex-wrap gap-1.5 border-b border-white/[0.08] pb-3">
          {activeEvents.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setSelectedId(e.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                selectedId === e.id
                  ? 'bg-white/[0.10] text-white'
                  : 'text-white/40 hover:bg-white/[0.05] hover:text-white/70'
              }`}
            >
              {e.title}
              {e.status === 'live' && (
                <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 align-middle" />
              )}
            </button>
          ))}
        </div>
      )}

      {selected && <EventPanel event={selected} onRefresh={refresh} onQuizEnded={onQuizEnded} />}
    </section>
  );
}

function EventPanel({
  event: initialEvent,
  onRefresh,
  onQuizEnded,
}: {
  event: EventCard;
  onRefresh: () => void;
  onQuizEnded?: () => void;
}) {
  const [state, setState] = useState<StateResponse | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [answering, setAnswering] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<{
    correctIndex: number;
    selected: number;
    isCorrect: boolean;
    position: number;
  } | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const event: EventCard = state?.event
    ? {
        ...initialEvent,
        ...state.event,
        checkpoints: initialEvent.checkpoints ?? state.event.checkpoints ?? [],
        me: state.me ?? initialEvent.me ?? null,
      }
    : initialEvent;

  const eventStatus = state?.event?.status ?? initialEvent.status;
  const isActive = eventStatus === 'scheduled' || eventStatus === 'live';
  const isOverdue =
    eventStatus === 'scheduled' && new Date(event.start_at).getTime() <= Date.now();

  const pollState = useCallback(async () => {
    try {
      const res = await fetchWithCreds(apiUrl(`/api/member/quiz/state?event_id=${initialEvent.id}`), {
        cache: 'no-store',
      });
      const data = (await res.json()) as StateResponse | { error: string };
      if ('error' in data) return;
      setState(data);
      if (data.current_question && data.current_question.position !== lastAnswer?.position) {
        setLastAnswer(null);
      }
      if (data.event.status === 'finished' || data.event.status === 'cancelled') {
        onRefresh();
        onQuizEnded?.();
        return;
      }
      if (data.event.status !== 'scheduled') {
        onRefresh();
      }
    } catch {
      // ignore
    }
  }, [initialEvent.id, lastAnswer?.position, onRefresh, onQuizEnded]);

  useEffect(() => {
    if (eventStatus === 'finished' || eventStatus === 'cancelled') {
      onQuizEnded?.();
      return;
    }
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
  }, [eventStatus, isActive, event.status, isOverdue, pollState, onQuizEnded]);

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
    if (!state?.current_question || answering) return;
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

  if (eventStatus === 'finished' || eventStatus === 'cancelled') {
    return <FinishRedirect />;
  }

  if (eventStatus === 'scheduled') {
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

  if (!state) return <LoadingRow label="Bağlanılıyor…" />;

  if (state.registration_closed || !state.joined) {
    return <MissedRegistrationView event={event} />;
  }

  if (state.me?.eliminated_at && eventStatus === 'live') {
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
    <div className={`${CARD} relative overflow-hidden`}>
      <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-indigo-500/8 blur-[60px] pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <StatusBadge />
            <h2 className="mt-3 text-xl sm:text-2xl font-black text-white tracking-tight">{event.title}</h2>
            {event.description && (
              <p className="mt-1.5 text-sm text-white/40 leading-relaxed">{event.description}</p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">
              {overdue ? 'Durum' : 'Kalan süre'}
            </p>
            {overdue ? (
              startBlocked ? (
                <p className="mt-1 text-sm font-semibold text-amber-300/90">Başlatılamadı</p>
              ) : (
                <p className="mt-1 text-sm font-semibold text-white/70">Başlatılıyor…</p>
              )
            ) : (
              <p className="mt-1 font-mono text-2xl sm:text-3xl font-black tabular-nums tracking-tight text-white">
                {countdown}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
          <StatCard
            label="Başlangıç"
            value={new Date(event.start_at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
            icon={<LuCalendar className="h-4 w-4" />}
            color="text-sky-400"
            small
          />
          <StatCard
            label="Soru"
            value={`${event.total_questions}`}
            sub={`${event.seconds_per_question} sn / soru`}
            icon={<LuCircleHelp className="h-4 w-4" />}
            color="text-violet-400"
          />
          <StatCard
            label="Hak"
            value={`${event.wrong_allowed}`}
            sub="yanlış hakkı"
            icon={<LuHeart className="h-4 w-4" />}
            color="text-rose-400"
          />
          <StatCard
            label="Havuz"
            value={Number(event.prize_pool_papel).toLocaleString('tr-TR')}
            sub="papel"
            icon={<LuCoins className="h-4 w-4" />}
            color="text-amber-400"
            highlight
          />
        </div>

        {(event.checkpoints ?? []).length > 0 && (
          <CheckpointList checkpoints={event.checkpoints ?? []} total={event.total_questions} />
        )}

        {startBlocked && (
          <div className={`${INNER} mb-4 border-amber-500/20 bg-amber-500/5`}>
            <p className="text-sm text-amber-200/90 leading-relaxed">{startBlocked}</p>
          </div>
        )}

        <div className={`${INNER} mb-5`}>
          <div className="flex items-center gap-2 mb-2">
            <LuZap className="h-3.5 w-3.5 text-white/30" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Kurallar</span>
          </div>
          <ul className="space-y-1 text-xs text-white/40 leading-relaxed">
            <li>Etkinlik başlamadan önce kayıt ol — geç katılım mümkün değil.</li>
            <li>{event.wrong_allowed} yanlış hakkın var; aşınca elenirsin.</li>
            <li>Her soru için {event.seconds_per_question} saniyen var.</li>
          </ul>
        </div>

        <div className="border-t border-white/[0.08] pt-5">
          {joined ? (
            <div className="flex items-center gap-2.5 text-sm text-white/60">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15">
                <LuCheck className="h-4 w-4 text-emerald-400" />
              </div>
              <span>Katıldın. Etkinlik başladığında sorular burada görünecek.</span>
            </div>
          ) : canJoin ? (
            <div>
              <p className="mb-4 text-sm text-white/45">
                Etkinlik başlamadan önce katılman gerekiyor. Geri sayım bittiğinde kayıt kapanır.
              </p>
              {joinError && <p className="mb-3 text-sm text-rose-300">{joinError}</p>}
              <button
                type="button"
                onClick={onJoin}
                disabled={joining}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-black transition-colors hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {joining ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black/60" />
                ) : (
                  <LuTrophy className="h-4 w-4" />
                )}
                {joining ? 'Kaydediliyor…' : 'Etkinliğe Katıl'}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MissedRegistrationView({ event }: { event: EventCard }) {
  return (
    <div className={`${CARD} py-10 text-center`}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
        <LuClock className="h-5 w-5 text-white/30" strokeWidth={1.5} />
      </div>
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-white/30">Canlı</p>
      <h2 className="mt-2 text-xl font-black text-white">{event.title}</h2>
      <p className="mx-auto mt-4 max-w-sm text-sm text-white/40 leading-relaxed">
        Bu etkinliğe katılmadın. Sorular yalnızca etkinlik başlamadan önce kayıt olan üyelere gösterilir.
      </p>
      <p className="mt-4 text-xs text-white/25 tabular-nums">
        Soru {event.current_position} / {event.total_questions}
      </p>
    </div>
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
      const elapsed =
        (Date.now() - new Date(event.current_question_started_at!).getTime()) / 1000;
      setSecondsLeft(Math.max(0, event.seconds_per_question - Math.floor(elapsed)));
    };
    update();
    const iv = setInterval(update, 250);
    return () => clearInterval(iv);
  }, [event.current_question_started_at, event.seconds_per_question]);

  if (!q) {
    return (
      <div className={`${CARD} py-10 text-center`}>
        <p className="text-sm text-white/50">
          {!event.questions_locked_at ? 'Sorular hazırlanıyor…' : 'Soru yükleniyor…'}
        </p>
      </div>
    );
  }

  const alreadyAnswered = !!answered || !!lastAnswer;
  const correctIdx = lastAnswer?.correctIndex ?? null;
  const heartsLeft = event.wrong_allowed - (me?.wrong_count ?? 0);
  const progressPct = Math.round((q.position / event.total_questions) * 100);

  return (
    <div className="flex flex-col gap-3">
      <div className={`${CARD} !py-3 !px-4`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <StatusBadge live />
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">
              Soru {q.position} / {event.total_questions}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Süre</p>
              <p className={`font-mono text-xl font-black tabular-nums ${secondsLeft <= 5 ? 'text-rose-400' : 'text-white'}`}>
                {secondsLeft}sn
              </p>
            </div>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: event.wrong_allowed }).map((_, i) => (
                <LuHeart
                  key={i}
                  className={`h-4 w-4 ${i < heartsLeft ? 'fill-rose-400/80 text-rose-400/80' : 'text-white/10'}`}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-amber-500/70 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className={`${CARD} relative overflow-hidden`}>
        <div className="absolute top-0 left-0 h-32 w-32 rounded-full bg-violet-500/8 blur-[50px] pointer-events-none" />
        <div className="relative z-10">
          {(q.category || q.difficulty) && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {q.category && (
                <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  {q.category}
                </span>
              )}
              {q.difficulty && (
                <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  {q.difficulty}
                </span>
              )}
            </div>
          )}
          <h3 className="text-lg sm:text-xl font-bold leading-snug text-white">{q.question_text}</h3>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {(q.options ?? []).map((opt, i) => {
              const isSelected = lastAnswer?.selected === i;
              const isCorrect = correctIdx === i;
              const showResult = alreadyAnswered && correctIdx !== null;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onAnswer(i)}
                  disabled={alreadyAnswered || answering || secondsLeft === 0}
                  className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                    showResult && isCorrect
                      ? 'border-emerald-500/30 bg-emerald-500/10'
                      : showResult && isSelected && !isCorrect
                        ? 'border-rose-500/30 bg-rose-500/10'
                        : alreadyAnswered
                          ? 'border-white/[0.04] bg-white/[0.02] opacity-40'
                          : 'border-white/[0.08] bg-white/[0.03] hover:border-white/[0.16] hover:bg-white/[0.06]'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                      showResult && isCorrect
                        ? 'bg-emerald-500 text-black'
                        : showResult && isSelected
                          ? 'bg-rose-500 text-white'
                          : 'bg-white/[0.08] text-white/60'
                    }`}
                  >
                    {'ABCD'[i]}
                  </span>
                  <span className="flex-1 text-sm text-white/85">{opt}</span>
                  {showResult && isCorrect && <LuCheck className="h-4 w-4 shrink-0 text-emerald-400" />}
                  {showResult && isSelected && !isCorrect && (
                    <LuX className="h-4 w-4 shrink-0 text-rose-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className={`${INNER} flex flex-wrap gap-x-6 gap-y-2 text-xs`}>
        <span className="text-white/35">
          Doğru: <span className="font-bold text-emerald-400">{me?.total_correct ?? 0}</span>
        </span>
        <span className="text-white/35">
          Yanlış:{' '}
          <span className="font-bold text-rose-400">
            {me?.wrong_count ?? 0} / {event.wrong_allowed}
          </span>
        </span>
        <span className="text-white/35">
          Kazanç:{' '}
          <span className="font-bold text-amber-300">
            {Number(me?.papel_earned ?? 0).toLocaleString('tr-TR')} papel
          </span>
        </span>
      </div>
    </div>
  );
}

function EliminatedView({ event, me }: { event: EventCard; me: MyState }) {
  return (
    <div className={`${CARD} relative overflow-hidden py-8 text-center`}>
      <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-rose-500/8 blur-[60px] pointer-events-none" />
      <div className="relative z-10">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10">
          <LuFlag className="h-5 w-5 text-rose-400" />
        </div>
        <h2 className="mt-4 text-xl font-black text-white">Elendin</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-white/40">
          {event.wrong_allowed} yanlış hakkını kullandın. Etkinlik bitince otomatik olarak ana sayfaya döneceksin.
        </p>
        <div className="mt-6 grid grid-cols-3 gap-3">
          <StatCard label="Doğru" value={`${me.total_correct}`} icon={<LuCheck className="h-4 w-4" />} color="text-emerald-400" compact />
          <StatCard label="Soru" value={`${me.last_position}`} icon={<LuCircleHelp className="h-4 w-4" />} color="text-violet-400" compact />
          <StatCard label="Papel" value={Number(me.papel_earned).toLocaleString('tr-TR')} icon={<LuCoins className="h-4 w-4" />} color="text-amber-400" highlight compact />
        </div>
      </div>
    </div>
  );
}

function FinishRedirect() {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-white/30">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-white/40" />
      <span className="text-sm">Ana sayfaya dönülüyor…</span>
    </div>
  );
}

function CheckpointList({ checkpoints, total }: { checkpoints: Checkpoint[]; total: number }) {
  return (
    <div className="mb-5">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-white/30">
        Checkpoint ödülleri (etkinlik boyunca)
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {checkpoints.map((c) => (
          <div key={c.position} className={`${INNER} flex items-center justify-between gap-3`}>
            <div>
              <p className="text-xs font-semibold text-white/70">
                Soru {c.position}{c.label ? <span className="text-white/35">{` · ${c.label}`}</span> : null}
              </p>
              <p className="text-[10px] text-white/30">{c.position}/{total} soru</p>
            </div>
            <span className="text-sm font-bold text-amber-300 tabular-nums">
              +{Number(c.papel_reward).toLocaleString('tr-TR')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  color,
  highlight,
  compact,
  small,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  highlight?: boolean;
  compact?: boolean;
  small?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-3 sm:p-4 transition-colors ${
        highlight ? 'border-amber-500/20 bg-amber-500/5' : 'border-white/[0.08] bg-white/[0.03]'
      } ${compact ? '!p-3' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">{label}</span>
        <span className={color}>{icon}</span>
      </div>
      <p
        className={`font-black tabular-nums ${
          small ? 'text-sm sm:text-base' : compact ? 'text-lg' : 'text-xl sm:text-2xl'
        } ${highlight ? 'text-amber-300' : 'text-white'}`}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[10px] text-white/30">{sub}</p>}
    </div>
  );
}
