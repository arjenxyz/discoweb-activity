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
  LuInfo,
} from 'react-icons/lu';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { apiUrl } from '@/lib/api';
import { QuizShell } from '@/components/quiz/QuizShell';
import { QuizCountdown } from '@/components/quiz/QuizCountdown';
import { QuizTimerRing } from '@/components/quiz/QuizTimerRing';
import { QuizIdleView } from '@/components/quiz/QuizIdleView';
import { QuizLoadingView } from '@/components/quiz/QuizLoadingView';
import { QuizProfileMenu, type QuizProfileMenuProps } from '@/components/quiz/QuizProfileMenu';
import { QUIZ_INTRO_COUNTDOWN_SECONDS } from '@/lib/quiz/constants';
import { useLocale, useT } from '@/contexts/LocaleContext';
import type { LanguageCode } from '@/lib/languages';

const DATE_LOCALES: Record<LanguageCode, string> = {
  en: 'en-US',
  pt: 'pt-BR',
  id: 'id-ID',
  es: 'es-MX',
  de: 'de-DE',
  tr: 'tr-TR',
  fr: 'fr-FR',
  hu: 'hu-HU',
  ja: 'ja-JP',
  ko: 'ko-KR',
  ru: 'ru-RU',
};

function useIntlLocale() {
  const { locale } = useLocale();
  return DATE_LOCALES[locale] ?? locale;
}

const JOIN_ERROR_KEYS: Record<string, string> = {
  registration_closed: 'quiz_join_error_closed',
  not_joinable: 'quiz_join_error_not_joinable',
  not_found: 'quiz_join_error_not_found',
  wrong_guild: 'quiz_join_error_wrong_guild',
};

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
  answered_this_position: {
    selected_index: number | null;
    is_correct?: boolean;
    correct_index?: number;
    revealed: boolean;
  } | null;
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

function InfoButton({ live, onClick }: { live?: boolean; onClick: () => void }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/55 transition-colors hover:bg-white/[0.08] hover:text-white/80"
    >
      {live && <span className="h-1.5 w-1.5 rounded-full animate-pulse bg-emerald-400" />}
      <LuInfo className="h-3.5 w-3.5" strokeWidth={2} />
      {t('quiz_info')}
    </button>
  );
}

function QuizInfoModal({ event, onClose }: { event: EventCard; onClose: () => void }) {
  const t = useT();
  const intlLocale = useIntlLocale();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const checkpoints = event.checkpoints ?? [];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quiz-info-title"
        className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-white/[0.10] bg-[#12141c] p-5 shadow-2xl custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p id="quiz-info-title" className="text-lg font-black text-white">
              {t('quiz_info_title')}
            </p>
            <p className="mt-0.5 text-sm text-white/40">{event.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/70"
            aria-label={t('quiz_close')}
          >
            <LuX className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-5">
          <StatCard
            label={t('quiz_stat_questions')}
            value={`${event.total_questions}`}
            sub={t('quiz_stat_questions_sub', { seconds: event.seconds_per_question })}
            icon={<LuCircleHelp className="h-4 w-4" />}
            color="text-violet-400"
            compact
          />
          <StatCard
            label={t('quiz_stat_lives')}
            value={`${event.wrong_allowed}`}
            sub={t('quiz_stat_lives_sub')}
            icon={<LuHeart className="h-4 w-4" />}
            color="text-rose-400"
            compact
          />
          <StatCard
            label={t('quiz_stat_pool')}
            value={Number(event.prize_pool_papel).toLocaleString(intlLocale)}
            sub={t('quiz_papel')}
            icon={<LuCoins className="h-4 w-4" />}
            color="text-amber-400"
            highlight
            compact
          />
          <StatCard
            label={t('quiz_stat_start')}
            value={new Date(event.start_at).toLocaleString(intlLocale, { dateStyle: 'short', timeStyle: 'short' })}
            icon={<LuCalendar className="h-4 w-4" />}
            color="text-sky-400"
            compact
            small
          />
        </div>

        {checkpoints.length > 0 && (
          <div className="mb-5">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-white/30">
              {t('quiz_checkpoints_title')}
            </p>
            <div className="grid gap-2">
              {checkpoints.map((c) => (
                <div key={c.position} className={`${INNER} flex items-center justify-between gap-3`}>
                  <div>
                    <p className="text-xs font-semibold text-white/70">
                      {t('quiz_question_n', { position: c.position })}
                      {c.label ? <span className="text-white/35">{` · ${c.label}`}</span> : null}
                    </p>
                    <p className="text-[10px] text-white/30">
                      {t('quiz_question_progress', { position: c.position, total: event.total_questions })}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-amber-300 tabular-nums">
                    +{Number(c.papel_reward).toLocaleString(intlLocale)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={INNER}>
          <div className="flex items-center gap-2 mb-2">
            <LuZap className="h-3.5 w-3.5 text-white/30" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">{t('quiz_rules')}</span>
          </div>
          <ul className="space-y-1.5 text-xs text-white/45 leading-relaxed">
            <li>{t('quiz_rule_register')}</li>
            <li>{t('quiz_rule_lives', { count: event.wrong_allowed })}</li>
            <li>{t('quiz_rule_timer', { seconds: event.seconds_per_question })}</li>
          </ul>
        </div>
      </div>
    </div>
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

export default function QuizEventSection({
  onQuizEnded,
  onImmersiveChange,
  profileMenu,
}: {
  onQuizEnded?: () => void;
  onImmersiveChange?: (immersive: boolean) => void;
  profileMenu?: QuizProfileMenuProps | null;
}) {
  const t = useT();
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

  const showEventArena = !!selected && !loading && !error;
  const quizHub = !loading;

  useEffect(() => {
    onImmersiveChange?.(quizHub);
    return () => onImmersiveChange?.(false);
  }, [quizHub, onImmersiveChange]);

  return (
    <section
      className={`relative flex w-full flex-1 flex-col ${quizHub ? 'min-h-0 gap-2 px-0 py-0' : 'gap-3 px-4 py-4 sm:px-5 sm:py-5'}`}
    >
      {quizHub && profileMenu && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-end p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
          <div className="pointer-events-auto">
            <QuizProfileMenu {...profileMenu} />
          </div>
        </div>
      )}

      {loading && <QuizLoadingView label={t('quiz_loading_arena')} />}

      {error && !loading && (
        <QuizShell variant="eliminated">
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-rose-400/80">{t('quiz_connection_issue')}</p>
            <p className="max-w-sm text-sm text-rose-200/90">{error}</p>
          </div>
        </QuizShell>
      )}

      {!loading && !error && activeEvents.length === 0 && !hadLiveRef.current && <QuizIdleView />}

      {!loading && activeEvents.length > 1 && !showEventArena && (
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

      {!loading && activeEvents.length > 1 && showEventArena && (
        <div className={`flex flex-wrap gap-1 px-1 ${profileMenu ? 'pr-36 pt-14 sm:pt-16' : ''}`}>
          {activeEvents.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setSelectedId(e.id)}
              className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                selectedId === e.id
                  ? 'bg-white/15 text-white'
                  : 'text-white/40 hover:bg-white/8 hover:text-white/70'
              }`}
            >
              {e.title}
              {e.status === 'live' && (
                <span className="ml-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 align-middle" />
              )}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className={showEventArena ? 'flex min-h-0 flex-1 flex-col' : undefined}>
          <EventPanel event={selected} onRefresh={refresh} onQuizEnded={onQuizEnded} />
        </div>
      )}
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
  const t = useT();
  const [state, setState] = useState<StateResponse | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [answering, setAnswering] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<{
    selected: number;
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
        const code = typeof data.error === 'string' ? data.error : '';
        setJoinError(t(JOIN_ERROR_KEYS[code] ?? 'quiz_join_error_generic'));
        return;
      }
      await pollState();
      onRefresh();
    } catch {
      setJoinError(t('quiz_join_error_generic'));
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
        selected: idx,
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

  if (!state) return <LoadingRow label={t('quiz_loading_question')} />;

  if (state.registration_closed || !state.joined) {
    return <MissedRegistrationView event={event} />;
  }

  if (state.me?.eliminated_at && eventStatus === 'live') {
    return <EliminatedView event={state.event} me={state.me} />;
  }

  return (
    <LivePlayView
      state={state}
      eventCard={event}
      onAnswer={submit}
      answering={answering}
      lastAnswer={lastAnswer}
      onRevealPoll={pollState}
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
  const t = useT();
  const intlLocale = useIntlLocale();
  const [showInfo, setShowInfo] = useState(false);
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
    <QuizShell variant="lobby">
      <div className="absolute left-4 top-4 z-20 sm:left-6 sm:top-6">
        <InfoButton onClick={() => setShowInfo(true)} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-indigo-300/80">{t('quiz_lobby')}</p>
        <h2 className="mt-2 max-w-lg text-xl font-black text-white sm:text-2xl">{event.title}</h2>
        {event.description && (
          <p className="mt-2 max-w-md text-sm leading-relaxed text-white/45">{event.description}</p>
        )}

        <div className="relative mt-8 flex h-40 w-40 items-center justify-center sm:h-48 sm:w-48">
          <div className="absolute inset-0 rounded-full border border-white/10 bg-white/[0.03]" />
          <div
            className={`absolute inset-2 rounded-full border-2 ${overdue ? 'border-amber-400/40' : 'border-indigo-400/30'} ${!overdue ? 'animate-quiz-pulse-urgent' : ''}`}
            style={{ animationDuration: '2.5s' }}
          />
          {overdue ? (
            <div className="relative z-10 px-4">
              {startBlocked ? (
                <p className="text-sm font-bold text-amber-300">{t('quiz_start_failed')}</p>
              ) : (
                <p className="text-lg font-black uppercase tracking-wider text-white/80">{t('quiz_starting')}</p>
              )}
            </div>
          ) : (
            <p className="relative z-10 font-mono text-4xl font-black tabular-nums tracking-tight text-white sm:text-5xl">
              {countdown}
            </p>
          )}
        </div>

        <p className="mt-4 text-xs uppercase tracking-wider text-white/35">
          {overdue ? t('quiz_going_live') : t('quiz_countdown_label')}
        </p>

        <div className="mt-6 grid w-full max-w-md grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCard label={t('quiz_stat_questions')} value={`${event.total_questions}`} icon={<LuCircleHelp className="h-4 w-4" />} color="text-violet-400" compact small />
          <StatCard label={t('quiz_stat_lives')} value={`${event.wrong_allowed}`} icon={<LuHeart className="h-4 w-4" />} color="text-rose-400" compact small />
          <StatCard
            label={t('quiz_stat_pool')}
            value={Number(event.prize_pool_papel).toLocaleString(intlLocale)}
            icon={<LuCoins className="h-4 w-4" />}
            color="text-amber-400"
            highlight
            compact
            small
          />
          <StatCard
            label={t('quiz_stat_time')}
            value={`${event.seconds_per_question}s`}
            icon={<LuClock className="h-4 w-4" />}
            color="text-sky-400"
            compact
            small
          />
        </div>

        {startBlocked && (
          <div className="mt-4 w-full max-w-md rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3">
            <p className="text-sm text-amber-100/90">{t('quiz_start_blocked_detail')}</p>
          </div>
        )}
      </div>

      <div className="mt-auto w-full max-w-md self-center pt-4">
        {joined ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            <LuCheck className="h-4 w-4 shrink-0" />
            <span>{t('quiz_joined')}</span>
          </div>
        ) : canJoin ? (
          <div>
            {joinError && <p className="mb-3 text-center text-sm text-rose-300">{joinError}</p>}
            <button
              type="button"
              onClick={onJoin}
              disabled={joining}
              className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 px-6 py-4 text-base font-black uppercase tracking-wider text-black shadow-[0_12px_40px_rgba(245,158,11,0.35)] transition active:scale-[0.98] disabled:opacity-50"
            >
              {joining ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-black/70" />
              ) : (
                <LuTrophy className="h-5 w-5" />
              )}
              {joining ? t('quiz_joining') : t('quiz_join')}
            </button>
          </div>
        ) : null}
      </div>

      {showInfo && <QuizInfoModal event={event} onClose={() => setShowInfo(false)} />}
    </QuizShell>
  );
}

function MissedRegistrationView({ event }: { event: EventCard }) {
  const t = useT();
  return (
    <QuizShell variant="muted">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
          <LuClock className="h-6 w-6 text-white/35" strokeWidth={1.5} />
        </div>
        <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-400/80">{t('quiz_live')}</p>
        <h2 className="mt-2 text-xl font-black text-white">{event.title}</h2>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-white/45">
          {t('quiz_missed_body')}
        </p>
        <p className="mt-6 font-mono text-sm tabular-nums text-white/30">
          {t('quiz_question_of', { position: event.current_position, total: event.total_questions })}
        </p>
      </div>
    </QuizShell>
  );
}

function LivePlayView({
  state,
  eventCard,
  onAnswer,
  answering,
  lastAnswer,
  onRevealPoll,
}: {
  state: StateResponse;
  eventCard: EventCard;
  onAnswer: (idx: number) => void;
  answering: boolean;
  lastAnswer: { selected: number; position: number } | null;
  onRevealPoll: () => void;
}) {
  const t = useT();
  const intlLocale = useIntlLocale();
  const { event, current_question: q, me, answered_this_position: answered } = state;
  const [secondsLeft, setSecondsLeft] = useState(event.seconds_per_question);
  const [showInfo, setShowInfo] = useState(false);
  const [roundCountdown, setRoundCountdown] = useState(false);
  const [shakeWrong, setShakeWrong] = useState(false);
  const [heartBreak, setHeartBreak] = useState(false);
  const prevPositionRef = useRef<number | null>(null);
  const prevWrongRef = useRef(me?.wrong_count ?? 0);

  const handleRoundCountdownDone = useCallback(() => {
    setRoundCountdown(false);
  }, []);

  useEffect(() => {
    if (!event.current_question_started_at) return;
    const update = () => {
      const elapsedSec =
        (Date.now() - new Date(event.current_question_started_at!).getTime()) / 1000;
      const isFirstQuestion = q?.position === 1;

      if (isFirstQuestion && roundCountdown) {
        setSecondsLeft(event.seconds_per_question);
        return;
      }

      const graceSec = isFirstQuestion ? QUIZ_INTRO_COUNTDOWN_SECONDS : 0;
      const adjustedElapsed = Math.max(0, elapsedSec - graceSec);
      setSecondsLeft(Math.max(0, event.seconds_per_question - Math.floor(adjustedElapsed)));
    };
    update();
    const iv = setInterval(update, 250);
    return () => clearInterval(iv);
  }, [event.current_question_started_at, event.seconds_per_question, q?.position, roundCountdown]);

  useEffect(() => {
    if (!q) return;
    if (q.position !== 1) {
      prevPositionRef.current = q.position;
      return;
    }
    if (prevPositionRef.current === 1) return;

    const startedMs = event.current_question_started_at
      ? new Date(event.current_question_started_at).getTime()
      : null;
    const elapsedSec = startedMs ? (Date.now() - startedMs) / 1000 : 0;

    setRoundCountdown(elapsedSec < QUIZ_INTRO_COUNTDOWN_SECONDS);
    prevPositionRef.current = q.position;
  }, [q?.position, event.current_question_started_at]);

  useEffect(() => {
    const wrong = me?.wrong_count ?? 0;
    if (wrong > prevWrongRef.current) {
      setHeartBreak(true);
      setShakeWrong(true);
      const t = setTimeout(() => {
        setHeartBreak(false);
        setShakeWrong(false);
      }, 600);
      prevWrongRef.current = wrong;
      return () => clearTimeout(t);
    }
    prevWrongRef.current = wrong;
  }, [me?.wrong_count]);

  const selectedIndex =
    answered?.selected_index ??
    (lastAnswer?.position === q?.position ? (lastAnswer?.selected ?? null) : null);
  const hasAnswered = selectedIndex !== null;
  const timerEnded = secondsLeft <= 0;
  const showResult = !!answered?.revealed && answered.correct_index !== undefined;
  const correctIdx = showResult ? answered!.correct_index! : null;
  const answeredCorrect = showResult && selectedIndex === correctIdx;

  useEffect(() => {
    if (!hasAnswered || showResult || !timerEnded) return;
    onRevealPoll();
    const iv = setInterval(onRevealPoll, 500);
    return () => clearInterval(iv);
  }, [hasAnswered, showResult, timerEnded, onRevealPoll]);

  if (!q) {
    return (
      <QuizShell variant="live">
        <div className="flex flex-1 items-center justify-center">
          <p className="animate-pulse text-sm text-white/50">
            {!event.questions_locked_at ? t('quiz_preparing_questions') : t('quiz_loading_question')}
          </p>
        </div>
      </QuizShell>
    );
  }

  const alreadyAnswered = hasAnswered;
  const heartsLeft = event.wrong_allowed - (me?.wrong_count ?? 0);
  const progressPct = Math.round((q.position / event.total_questions) * 100);
  const urgent = secondsLeft <= 5 && !showResult && !roundCountdown;

  return (
    <QuizShell variant="live">
      <QuizCountdown active={roundCountdown} onComplete={handleRoundCountdownDone} />

      {/* HUD */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <InfoButton live onClick={() => setShowInfo(true)} />
          <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">
            {t('quiz_question_of', { position: q.position, total: event.total_questions })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <QuizTimerRing
            secondsLeft={secondsLeft}
            totalSeconds={event.seconds_per_question}
            urgent={urgent}
          />
          <div className={`flex items-center gap-0.5 ${heartBreak ? 'animate-quiz-heart-break' : ''}`}>
            {Array.from({ length: event.wrong_allowed }).map((_, i) => (
              <LuHeart
                key={i}
                className={`h-5 w-5 transition-all duration-300 ${
                  i < heartsLeft ? 'fill-rose-400/90 text-rose-400/90' : 'scale-75 text-white/10'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Question arena */}
      <div
        key={q.position}
        className={`relative flex min-h-0 flex-1 flex-col ${shakeWrong && showResult ? 'animate-quiz-shake' : ''}`}
      >
        {!roundCountdown && (
          <div className="animate-quiz-fade-in flex min-h-0 flex-1 flex-col">
            {(q.category || q.difficulty) && (
              <div className="mb-3 flex flex-wrap justify-center gap-2">
                {q.category && (
                  <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-200/80">
                    {q.category}
                  </span>
                )}
                {q.difficulty && (
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/50">
                    {q.difficulty}
                  </span>
                )}
              </div>
            )}

            <h3 className="text-center text-lg font-bold leading-snug text-white sm:text-xl md:text-2xl">
              {q.question_text}
            </h3>

            <div className="mt-5 grid flex-1 content-start gap-2.5 sm:grid-cols-2">
              {(q.options ?? []).map((opt, i) => {
                const isSelected = selectedIndex === i;
                const isCorrect = correctIdx === i;
                const revealDelay = showResult ? `${i * 80}ms` : '0ms';
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onAnswer(i)}
                    disabled={alreadyAnswered || answering || timerEnded || roundCountdown}
                    style={{ animationDelay: revealDelay }}
                    className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all active:scale-[0.98] ${
                      showResult && isCorrect
                        ? 'animate-quiz-glow-correct border-emerald-400/40 bg-emerald-500/15'
                        : showResult && isSelected && !isCorrect
                          ? 'border-rose-500/40 bg-rose-500/15'
                          : isSelected && !showResult
                            ? 'border-amber-400/40 bg-amber-500/15 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                            : alreadyAnswered
                              ? 'border-white/[0.04] bg-white/[0.02] opacity-35'
                              : 'border-white/10 bg-white/[0.04] hover:border-amber-400/30 hover:bg-white/[0.08]'
                    } ${showResult && isCorrect ? 'animate-quiz-pop' : ''}`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-black ${
                        showResult && isCorrect
                          ? 'bg-emerald-400 text-black'
                          : showResult && isSelected
                            ? 'bg-rose-500 text-white'
                            : isSelected && !showResult
                              ? 'bg-amber-400 text-black'
                              : 'bg-white/10 text-white/55'
                      }`}
                    >
                      {'ABCD'[i]}
                    </span>
                    <span className="flex-1 text-sm text-white/90">{opt}</span>
                    {showResult && isCorrect && <LuCheck className="h-5 w-5 shrink-0 text-emerald-400" />}
                    {showResult && isSelected && !isCorrect && (
                      <LuX className="h-5 w-5 shrink-0 text-rose-400" />
                    )}
                  </button>
                );
              })}
            </div>

            {showResult && answeredCorrect && (
              <p className="mt-4 text-center text-sm font-bold text-emerald-300 animate-quiz-pop">
                {t('quiz_correct')}
              </p>
            )}
            {hasAnswered && !showResult && (
              <p className="mt-4 text-center text-xs text-white/40">
                {t('quiz_answer_saved')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 rounded-xl border border-white/10 bg-black/25 px-4 py-2.5 text-xs backdrop-blur-md">
        <span className="text-white/40">
          {t('quiz_stat_correct')} <span className="font-black text-emerald-400">{me?.total_correct ?? 0}</span>
        </span>
        <span className="text-white/20">|</span>
        <span className="text-white/40">
          {t('quiz_stat_wrong')}{' '}
          <span className="font-black text-rose-400">
            {me?.wrong_count ?? 0}/{event.wrong_allowed}
          </span>
        </span>
        <span className="text-white/20">|</span>
        <span className="text-white/40">
          <LuCoins className="mr-1 inline h-3.5 w-3.5 text-amber-400" />
          <span className="font-black text-amber-300">
            {Number(me?.papel_earned ?? 0).toLocaleString(intlLocale)}
          </span>{' '}
          {t('quiz_papel')}
        </span>
      </div>

      {showInfo && <QuizInfoModal event={eventCard} onClose={() => setShowInfo(false)} />}
    </QuizShell>
  );
}

function EliminatedView({ event, me }: { event: EventCard; me: MyState }) {
  const t = useT();
  const intlLocale = useIntlLocale();
  const progressPct = event.total_questions > 0
    ? Math.min(100, Math.round((me.last_position / event.total_questions) * 100))
    : 0;

  return (
    <QuizShell variant="eliminated">
      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-2 py-6 text-center animate-quiz-fade-in sm:py-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(244,63,94,0.12)_0%,transparent_55%)]" />

        <div className="relative">
          <div className="absolute inset-0 m-auto h-28 w-28 rounded-full bg-rose-500/15 blur-3xl" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-rose-500/35 bg-rose-500/10 shadow-[0_0_48px_rgba(244,63,94,0.22)] animate-quiz-pop sm:h-24 sm:w-24">
            <LuFlag className="h-9 w-9 text-rose-400 sm:h-10 sm:w-10" strokeWidth={1.5} />
          </div>
        </div>

        <p className="relative mt-8 text-[11px] font-bold uppercase tracking-[0.45em] text-rose-400">{t('quiz_eliminated')}</p>
        <h2 className="relative mt-3 text-3xl font-black text-white sm:text-4xl">{t('quiz_round_over')}</h2>

        <div className="relative mt-4 flex items-center justify-center gap-1.5">
          {Array.from({ length: event.wrong_allowed }).map((_, i) => (
            <LuHeart
              key={i}
              className="h-6 w-6 text-rose-500/25"
              fill="currentColor"
            />
          ))}
        </div>

        <p className="relative mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/50">
          {t('quiz_eliminated_body', { count: event.wrong_allowed })}
        </p>

        <div className="relative mt-8 w-full max-w-lg rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-sm">
          <div className="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-white/35">
            <span>{t('quiz_progress')}</span>
            <span>
              {t('quiz_question_of', { position: me.last_position, total: event.total_questions })}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-600/80 to-rose-400/50 transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-3 py-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{t('quiz_stat_correct')}</span>
                <LuCheck className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="mt-2 text-2xl font-black tabular-nums text-emerald-300">{me.total_correct}</p>
            </div>
            <div className="rounded-xl border border-violet-500/15 bg-violet-500/5 px-3 py-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{t('quiz_stat_questions')}</span>
                <LuCircleHelp className="h-4 w-4 text-violet-400" />
              </div>
              <p className="mt-2 text-2xl font-black tabular-nums text-violet-200">{me.last_position}</p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{t('quiz_papel')}</span>
                <LuCoins className="h-4 w-4 text-amber-400" />
              </div>
              <p className="mt-2 text-2xl font-black tabular-nums text-amber-300">
                {Number(me.papel_earned).toLocaleString(intlLocale)}
              </p>
            </div>
          </div>
        </div>

        <div className="relative mt-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/20 px-4 py-2 text-xs text-white/45">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          {t('quiz_still_live')}
        </div>
      </div>
    </QuizShell>
  );
}

function FinishRedirect() {
  const t = useT();
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-white/30">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-white/40" />
      <span className="text-sm">{t('quiz_returning_home')}</span>
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
