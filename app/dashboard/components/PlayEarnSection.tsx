'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { apiUrl } from '@/lib/api';
import FishingGame from '@/components/play-earn/FishingGame';
import {
  PERSONAS,
  buildVisualTheme,
  loadStoredPersona,
  loadStoredTimeMode,
  resolveTimeOfDay,
  storePersona,
  storeTimeMode,
  type PersonaId,
  type TimeMode,
} from '@/components/play-earn/fishTheme';
import type { SpawnEntry } from '@/lib/playEarn/types';
import { useT } from '@/contexts/LocaleContext';
import { LuCoins, LuFish, LuLoader, LuMoon, LuPlay, LuSun } from 'react-icons/lu';

type WalletData = {
  fishTokenBalance: number;
  papelBalance: number;
  remainingPapelCap: number;
  jetonPerPapel: number;
  minConvertJeton: number;
};

type GameConfig = {
  gameEnabled: boolean;
  sessionDurationSec: number;
  sessionCooldownSec: number;
  jetonPerPapel: number;
  dailyPapelCap: number;
  minConvertJeton: number;
};

type SessionData = {
  sessionId: string;
  startedAt: string;
  durationSec: number;
  manifest: SpawnEntry[];
};

type Props = {
  onWalletRefresh?: () => void;
};

export default function PlayEarnSection({ onWalletRefresh }: Props) {
  const t = useT();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ tokensEarned: number; catches: number } | null>(null);
  const [convertAmount, setConvertAmount] = useState('');
  const [persona, setPersona] = useState<PersonaId>('ocean');
  const [timeMode, setTimeMode] = useState<TimeMode>('auto');
  const [clockTick, setClockTick] = useState(0);

  useEffect(() => {
    setPersona(loadStoredPersona());
    setTimeMode(loadStoredTimeMode());
    const id = setInterval(() => setClockTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const resolvedTime = useMemo(() => resolveTimeOfDay(timeMode), [timeMode, clockTick]);
  const visualTheme = useMemo(() => buildVisualTheme(persona, resolvedTime), [persona, resolvedTime]);

  const refresh = useCallback(async () => {
    try {
      const [wRes, cRes] = await Promise.all([
        fetchWithCreds(apiUrl('/api/member/play-earn/wallet'), { cache: 'no-store' }),
        fetchWithCreds(apiUrl('/api/member/play-earn/config'), { cache: 'no-store' }),
      ]);
      if (wRes.ok) setWallet(await wRes.json());
      if (cRes.ok) setConfig(await cRes.json());
      onWalletRefresh?.();
    } catch {
      setError(t('play_earn_load_error'));
    } finally {
      setLoading(false);
    }
  }, [onWalletRefresh, t]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const startGame = async () => {
    setStarting(true);
    setError(null);
    setSummary(null);
    try {
      const res = await fetchWithCreds(apiUrl('/api/member/play-earn/session/start'), { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'cooldown') {
          setError(t('play_earn_cooldown', { sec: String(data.retryAfterSec ?? '?') }));
        } else if (data.error === 'daily_session_limit') {
          setError(t('play_earn_daily_limit'));
        } else if (data.error === 'game_disabled') {
          setError(t('play_earn_disabled'));
        } else {
          setError(t('play_earn_start_failed'));
        }
        return;
      }
      setSession({
        sessionId: data.sessionId,
        startedAt: data.startedAt,
        durationSec: data.durationSec,
        manifest: data.manifest,
      });
    } catch {
      setError(t('play_earn_network_error'));
    } finally {
      setStarting(false);
    }
  };

  const handleConvert = async () => {
    const amount = Math.floor(Number(convertAmount));
    if (!amount || amount <= 0) return;
    setConverting(true);
    setError(null);
    try {
      const res = await fetchWithCreds(apiUrl('/api/member/play-earn/convert'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountJeton: amount }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'daily_papel_cap') {
          setError(t('play_earn_cap_remaining', { remaining: String(data.remaining ?? 0) }));
        } else if (data.error === 'below_minimum') {
          setError(t('play_earn_min_convert', { min: String(data.min) }));
        } else {
          setError(t('play_earn_convert_failed'));
        }
        return;
      }
      setConvertAmount('');
      await refresh();
    } catch {
      setError(t('play_earn_convert_error'));
    } finally {
      setConverting(false);
    }
  };

  if (session) {
    return (
      <div className="fixed inset-0 z-[60] bg-[#041018]">
        <FishingGame
          session={session}
          visualTheme={visualTheme}
          onEnd={(s) => {
            setSession(null);
            setSummary(s);
            refresh();
          }}
          onCancel={() => {
            setSession(null);
            fetchWithCreds(apiUrl('/api/member/play-earn/session/end'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId: session.sessionId }),
            }).finally(refresh);
          }}
        />
      </div>
    );
  }

  return (
    <section className="mx-auto w-full max-w-2xl space-y-4 p-4 sm:p-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-cyan-400/70">{t('nav_play_earn')}</p>
        <h1 className="text-2xl font-black text-white">{t('play_earn_title')}</h1>
        <p className="mt-1 text-sm text-white/45">{t('play_earn_subtitle')}</p>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <LuLoader className="h-8 w-8 animate-spin text-cyan-400" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
              <div className="flex items-center gap-2 text-cyan-300">
                <LuFish className="h-4 w-4" />
                <span className="text-xs font-bold uppercase">{t('play_earn_fish_token')}</span>
              </div>
              <p className="mt-2 text-2xl font-black text-white">{wallet?.fishTokenBalance ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-center gap-2 text-amber-300">
                <LuCoins className="h-4 w-4" />
                <span className="text-xs font-bold uppercase">Papel</span>
              </div>
              <p className="mt-2 text-2xl font-black text-white">{wallet?.papelBalance ?? 0}</p>
            </div>
          </div>

          {config && (
            <p className="text-xs text-white/40">
              {t('play_earn_rules', {
                jeton: String(config.jetonPerPapel),
                cap: String(config.dailyPapelCap),
                sec: String(config.sessionDurationSec),
              })}
            </p>
          )}

          {summary && (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              {t('play_earn_round_summary', { catches: String(summary.catches), tokens: String(summary.tokensEarned) })}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
          )}

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
            <p className="text-sm font-bold text-white">{t('play_earn_theme_title')}</p>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">{t('play_earn_persona_label')}</p>
              <div className="flex flex-wrap gap-2">
                {PERSONAS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPersona(p.id);
                      storePersona(p.id);
                    }}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                      persona === p.id
                        ? 'border-white/40 text-white'
                        : 'border-white/10 text-white/55 hover:border-white/25'
                    }`}
                    style={persona === p.id ? { backgroundColor: `${p.accent}33`, borderColor: `${p.accent}88` } : undefined}
                  >
                    {t(p.labelKey)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">{t('play_earn_time_label')}</p>
              <div className="flex flex-wrap gap-2">
                {(['auto', 'day', 'night'] as TimeMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setTimeMode(mode);
                      storeTimeMode(mode);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                      timeMode === mode
                        ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-100'
                        : 'border-white/10 text-white/55 hover:border-white/25'
                    }`}
                  >
                    {mode === 'day' && <LuSun className="h-3.5 w-3.5" />}
                    {mode === 'night' && <LuMoon className="h-3.5 w-3.5" />}
                    {t(mode === 'auto' ? 'play_earn_time_auto' : mode === 'day' ? 'play_earn_time_day' : 'play_earn_time_night')}
                  </button>
                ))}
              </div>
              {timeMode === 'auto' && (
                <p className="mt-2 text-[11px] text-white/35">
                  {resolvedTime === 'day' ? t('play_earn_time_active_day') : t('play_earn_time_active_night')}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={startGame}
            disabled={starting || config?.gameEnabled === false}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-fuchsia-600 py-4 text-sm font-black uppercase tracking-wider text-white disabled:opacity-50"
          >
            {starting ? <LuLoader className="h-5 w-5 animate-spin" /> : <LuPlay className="h-5 w-5" />}
            {t('play_earn_play')}
          </button>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-bold text-white">{t('play_earn_convert_title')}</p>
            <p className="mt-1 text-xs text-white/40">
              {t('play_earn_convert_hint', {
                min: String(wallet?.minConvertJeton ?? 100),
                remaining: String(wallet?.remainingPapelCap ?? 0),
              })}
            </p>
            <div className="mt-3 flex gap-2">
              <input
                type="number"
                min={1}
                value={convertAmount}
                onChange={(e) => setConvertAmount(e.target.value)}
                placeholder={t('play_earn_convert_placeholder')}
                className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/40"
              />
              <button
                type="button"
                onClick={handleConvert}
                disabled={converting}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {converting ? '...' : t('play_earn_convert_btn')}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
