'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuTrophy, LuClock, LuHeart, LuCheck, LuX, LuFlag, LuCalendar, LuCoins } from 'react-icons/lu';
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
  checkpoints: Checkpoint[];
  me: MyState | null;
};

type StateResponse = {
  event: EventCard & { questions_locked_at?: string | null };
  current_question: { position: number; question_text: string; options: string[]; category: string | null; difficulty: string | null } | null;
  answered_this_position: { selected_index: number | null; is_correct: boolean } | null;
  me: MyState | null;
  joined: boolean;
  server_now: string;
};

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
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15000);
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
    <div className="min-h-screen bg-[#0b0d12] text-white">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
            <LuTrophy className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Quiz Etkinlikleri</h1>
            <p className="text-xs text-white/50">Doğru cevapla, ödülü kap</p>
          </div>
        </div>

        {loading && <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 text-center text-white/40">Yükleniyor...</div>}

        {error && !loading && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center">
            <LuCalendar className="mx-auto h-10 w-10 text-white/30" />
            <p className="mt-3 text-sm text-white/60">Şu an aktif veya yaklaşan bir quiz etkinliği yok.</p>
            <p className="mt-1 text-xs text-white/40">Yeni etkinliklerden anında haberdar olmak için bu sayfayı ziyaret etmeyi unutma.</p>
          </div>
        )}

        {!loading && events.length > 1 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {events.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelectedId(e.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  selectedId === e.id
                    ? 'border-amber-400/40 bg-amber-500/15 text-amber-200'
                    : 'border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06]'
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

function EventPanel({ event, onRefresh }: { event: EventCard; onRefresh: () => void }) {
  // Live mod için detaylı state pulling
  const [liveState, setLiveState] = useState<StateResponse | null>(null);
  const [joining, setJoining] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<{ correctIndex: number; selected: number; isCorrect: boolean; position: number } | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const isLive = event.status === 'live';

  const pollState = useCallback(async () => {
    try {
      const res = await fetchWithCreds(apiUrl(`/api/member/quiz/state?event_id=${event.id}`), { cache: 'no-store' });
      const data = (await res.json()) as StateResponse | { error: string };
      if ('error' in data) return;
      setLiveState(data);
      if (data.current_question && data.current_question.position !== lastAnswer?.position) {
        setLastAnswer(null);
      }
    } catch {
      // ignore
    }
  }, [event.id, lastAnswer?.position]);

  useEffect(() => {
    if (!isLive) return;
    pollState();
    pollRef.current = setInterval(pollState, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isLive, pollState]);

  const join = async () => {
    setJoining(true);
    try {
      const res = await fetchWithCreds(apiUrl('/api/member/quiz/join'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: event.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      await pollState();
      onRefresh();
    } catch (e) {
      console.warn('[quiz] join failed', e);
    } finally {
      setJoining(false);
    }
  };

  const submit = async (idx: number) => {
    if (!liveState?.current_question) return;
    if (answering) return;
    setAnswering(true);
    try {
      const res = await fetchWithCreds(apiUrl('/api/member/quiz/answer'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: event.id,
          position: liveState.current_question.position,
          selected_index: idx,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.warn('[quiz] answer failed', data.error);
        return;
      }
      setLastAnswer({
        correctIndex: data.correct_index,
        selected: idx,
        isCorrect: data.is_correct,
        position: liveState.current_question.position,
      });
      await pollState();
    } finally {
      setAnswering(false);
    }
  };

  // 4 durum render
  if (event.status === 'scheduled') {
    return <ScheduledView event={event} />;
  }
  if (event.status === 'finished' || event.status === 'cancelled') {
    return <FinishedView event={event} />;
  }
  // Live
  if (!liveState) {
    return <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 text-center text-white/40">Etkinlik yükleniyor...</div>;
  }
  if (!liveState.joined || (liveState.me && !liveState.me.eliminated_at && liveState.me.last_position < liveState.event.current_position - 1)) {
    return <LiveJoinView event={liveState.event} onJoin={join} joining={joining} />;
  }
  if (liveState.me?.eliminated_at) {
    return <EliminatedView event={liveState.event} me={liveState.me} />;
  }
  return (
    <LivePlayView
      state={liveState}
      onAnswer={submit}
      answering={answering}
      lastAnswer={lastAnswer}
    />
  );
}

function ScheduledView({ event }: { event: EventCard }) {
  const [countdown, setCountdown] = useState('');
  useEffect(() => {
    const tick = () => {
      const ms = new Date(event.start_at).getTime() - Date.now();
      if (ms <= 0) setCountdown('Çok yakında!');
      else {
        const s = Math.floor(ms / 1000);
        const d = Math.floor(s / 86400);
        const h = Math.floor((s % 86400) / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        setCountdown(d > 0 ? `${d}g ${h}sa ${m}dk` : h > 0 ? `${h}sa ${m}dk ${sec}sn` : `${m}dk ${sec}sn`);
      }
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [event.start_at]);

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a1d28] to-[#0f1116] p-6">
      <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-xs text-blue-300">
        <LuCalendar className="h-3 w-3" /> Yaklaşıyor
      </div>
      <h2 className="text-2xl font-bold">{event.title}</h2>
      {event.description && <p className="mt-1 text-sm text-white/60">{event.description}</p>}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<LuClock className="h-4 w-4" />} label="Başlangıç" value={new Date(event.start_at).toLocaleString('tr-TR')} />
        <Stat icon={<LuClock className="h-4 w-4" />} label="Geri Sayım" value={countdown} highlight />
        <Stat icon={<LuTrophy className="h-4 w-4" />} label="Soru" value={`${event.total_questions} · ${event.seconds_per_question}sn`} />
        <Stat icon={<LuCoins className="h-4 w-4" />} label="Havuz" value={`${Number(event.prize_pool_papel).toLocaleString('tr-TR')} papel`} highlight />
      </div>

      <CheckpointBar checkpoints={event.checkpoints} total={event.total_questions} />

      <div className="mt-6 rounded-lg border border-white/5 bg-white/[0.02] p-3 text-xs text-white/50">
        <p>• {event.wrong_allowed} yanlış cevap hakkın var. {event.wrong_allowed} yanlışa ulaşırsan elenirsin.</p>
        <p>• Soruları sırayla cevapla. Her soru {event.seconds_per_question} saniyede tamamlanmalı.</p>
        <p>• Tüm soruları doğru cevaplayanlar {Number(event.prize_pool_papel).toLocaleString('tr-TR')} papel havuzunu eşit paylaşır.</p>
      </div>
    </div>
  );
}

function LiveJoinView({ event, onJoin, joining }: { event: EventCard; onJoin: () => void; joining: boolean }) {
  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 to-[#0f1116] p-6">
      <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> CANLI
      </div>
      <h2 className="text-2xl font-bold">{event.title}</h2>
      <p className="mt-1 text-sm text-white/60">
        Etkinlik şu an canlı! Soru {event.current_position} / {event.total_questions}
      </p>

      <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
        Geç katıldın — şu anki soruya cevap verebilirsin ama geçen sorular için puan alamadın. Yine de havuzun büyük dilimi için yarışmak istiyorsan hemen katıl!
      </div>

      <button
        onClick={onJoin}
        disabled={joining}
        className="mt-6 w-full rounded-xl bg-emerald-500 px-4 py-3 text-base font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-60"
      >
        {joining ? 'Katılıyor...' : 'Hemen Katıl'}
      </button>
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
      const elapsed = (Date.now() - new Date(event.current_question_started_at!).getTime()) / 1000;
      const left = Math.max(0, event.seconds_per_question - Math.floor(elapsed));
      setSecondsLeft(left);
    };
    update();
    const iv = setInterval(update, 250);
    return () => clearInterval(iv);
  }, [event.current_question_started_at, event.seconds_per_question]);

  if (!q) {
    return <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center text-white/40">Soru bekleniyor...</div>;
  }

  const alreadyAnswered = !!answered || !!lastAnswer;
  const correctIdx = lastAnswer?.correctIndex ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="text-xs text-white/40">Soru</div>
          <div className="text-lg font-bold">{q.position} / {event.total_questions}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-amber-300">
            <LuClock className="h-4 w-4" />
            <span className="font-mono text-lg font-bold">{secondsLeft}sn</span>
          </div>
          <div className="flex items-center gap-1 text-rose-300">
            {Array.from({ length: event.wrong_allowed }).map((_, i) => (
              <LuHeart
                key={i}
                className={`h-4 w-4 ${i < (event.wrong_allowed - (me?.wrong_count ?? 0)) ? 'fill-rose-400 text-rose-400' : 'text-rose-900/50'}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a1d28] to-[#0f1116] p-6">
        {q.category && (
          <div className="mb-3 inline-block rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/50">{q.category}</div>
        )}
        <h3 className="text-xl font-semibold leading-snug text-white">{q.question_text}</h3>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {q.options.map((opt, i) => {
            const isSelected = lastAnswer?.selected === i;
            const isCorrect = correctIdx === i;
            const showResult = alreadyAnswered && correctIdx !== null;
            return (
              <button
                key={i}
                onClick={() => onAnswer(i)}
                disabled={alreadyAnswered || answering || secondsLeft === 0}
                className={`group relative flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                  showResult && isCorrect
                    ? 'border-emerald-400/60 bg-emerald-500/15'
                    : showResult && isSelected && !isCorrect
                      ? 'border-rose-400/60 bg-rose-500/15'
                      : alreadyAnswered
                        ? 'border-white/5 bg-white/[0.02] opacity-50'
                        : 'border-white/10 bg-white/[0.03] hover:border-amber-400/40 hover:bg-amber-500/5'
                }`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                  showResult && isCorrect ? 'bg-emerald-500 text-black' :
                  showResult && isSelected ? 'bg-rose-500 text-white' :
                  'bg-white/10 text-white/70'
                }`}>
                  {'ABCD'[i]}
                </span>
                <span className="flex-1 text-sm text-white/90">{opt}</span>
                {showResult && isCorrect && <LuCheck className="h-5 w-5 text-emerald-300" />}
                {showResult && isSelected && !isCorrect && <LuX className="h-5 w-5 text-rose-300" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-white/50">
        <div className="flex flex-wrap gap-4">
          <span>Doğru: <b className="text-emerald-300">{me?.total_correct ?? 0}</b></span>
          <span>Yanlış: <b className="text-rose-300">{me?.wrong_count ?? 0} / {event.wrong_allowed}</b></span>
          <span>Kazanılan papel (tahmini): <b className="text-amber-300">{Number(me?.papel_earned ?? 0).toLocaleString('tr-TR')}</b></span>
        </div>
      </div>
    </div>
  );
}

function EliminatedView({ event, me }: { event: EventCard; me: MyState }) {
  return (
    <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-950/40 to-[#0f1116] p-6 text-center">
      <LuFlag className="mx-auto h-10 w-10 text-rose-400" />
      <h2 className="mt-3 text-2xl font-bold">Elendin</h2>
      <p className="mt-1 text-sm text-white/60">
        {event.wrong_allowed} yanlış hakkını kullandın. Bu etkinlikte daha fazla soru cevaplayamayacaksın.
      </p>
      <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
          <div className="text-xs text-white/50">Doğru</div>
          <div className="mt-1 text-xl font-bold text-emerald-300">{me.total_correct}</div>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
          <div className="text-xs text-white/50">Ulaştığın Soru</div>
          <div className="mt-1 text-xl font-bold text-white">{me.last_position}</div>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
          <div className="text-xs text-white/50">Tahmini Papel</div>
          <div className="mt-1 text-xl font-bold text-amber-300">{Number(me.papel_earned).toLocaleString('tr-TR')}</div>
        </div>
      </div>
    </div>
  );
}

function FinishedView({ event }: { event: EventCard }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a1d28] to-[#0f1116] p-6">
      <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/60">
        {event.status === 'cancelled' ? 'İptal Edildi' : 'Tamamlandı'}
      </div>
      <h2 className="text-2xl font-bold">{event.title}</h2>
      {event.me ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={<LuCheck className="h-4 w-4" />} label="Doğru" value={`${event.me.total_correct} / ${event.total_questions}`} />
          <Stat icon={<LuX className="h-4 w-4" />} label="Yanlış" value={`${event.me.wrong_count}`} />
          <Stat icon={<LuTrophy className="h-4 w-4" />} label="Mükemmel Skor" value={event.me.perfect_score ? 'Evet' : 'Hayır'} highlight={event.me.perfect_score} />
          <Stat icon={<LuCoins className="h-4 w-4" />} label="Kazanılan Papel" value={Number(event.me.papel_earned).toLocaleString('tr-TR')} highlight />
        </div>
      ) : (
        <p className="mt-4 text-sm text-white/50">Bu etkinliğe katılmadın.</p>
      )}
      <CheckpointBar checkpoints={event.checkpoints} total={event.total_questions} />
    </div>
  );
}

function CheckpointBar({ checkpoints, total }: { checkpoints: Checkpoint[]; total: number }) {
  if (!checkpoints.length) return null;
  return (
    <div className="mt-6">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">Checkpoint Ödülleri</div>
      <div className="relative">
        <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/10" />
        <div className="relative flex justify-between">
          {checkpoints.map((c) => (
            <div key={c.position} className="flex flex-col items-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-400/40 bg-amber-500/15 text-amber-300">
                <LuTrophy className="h-4 w-4" />
              </div>
              <div className="mt-2 text-center text-[11px] text-white/60">
                <div className="font-semibold text-white">{c.position}/{total}</div>
                <div className="text-amber-300">+{c.papel_reward} papel</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? 'border-amber-400/30 bg-amber-500/5' : 'border-white/5 bg-white/[0.02]'}`}>
      <div className="flex items-center gap-1.5 text-xs text-white/40">
        {icon} {label}
      </div>
      <div className={`mt-1 text-sm font-semibold ${highlight ? 'text-amber-200' : 'text-white'}`}>{value}</div>
    </div>
  );
}
