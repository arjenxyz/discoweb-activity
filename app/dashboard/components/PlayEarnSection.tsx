'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { apiUrl } from '@/lib/api';
import FishingGame from '@/components/play-earn/FishingGame';
import GameShell from '@/components/play-earn/GameShell';
import {
  PERSONA_META,
  resolveAutoVisualTheme,
  resolveTimeOfDay,
} from '@/components/play-earn/fishTheme';
import type { SpawnEntry } from '@/lib/playEarn/types';
import { useT } from '@/contexts/LocaleContext';
import { LuCoins, LuFish, LuLoader, LuMoon, LuPlay, LuSun, LuWaves } from 'react-icons/lu';

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

  const lobbyTheme = useMemo(() => resolveAutoVisualTheme('lobby-preview'), []);
  const sessionTheme = useMemo(
    () => (session ? resolveAutoVisualTheme(session.sessionId) : lobbyTheme),
    [session, lobbyTheme],
  );
  const lobbyAccent = PERSONA_META[lobbyTheme.persona].accent;
  const isDay = resolveTimeOfDay() === 'day';

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
      <FishingGame
        session={session}
        visualTheme={sessionTheme}
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
    );
  }

  return (
    <section className="mx-auto w-full max-w-2xl p-3 sm:p-4">
      <GameShell
        title={t('play_earn_title')}
        subtitle={t('play_earn_subtitle')}
        accent={lobbyAccent}
      >
        {loading ? (
          <div className="flex h-56 items-center justify-center">
            <LuLoader className="h-9 w-9 animate-spin" style={{ color: lobbyAccent }} />
          </div>
        ) : (
          <div className="space-y-0">
            {/* Oyun önizleme alanı */}
            <div className="relative overflow-hidden border-b border-white/10 px-4 pb-5 pt-4">
              <div
                className="relative aspect-[16/7] overflow-hidden rounded-xl border-2 border-white/10"
                style={{
                  background: `linear-gradient(180deg, ${lobbyTheme.waterGradient[0]} 0%, ${lobbyTheme.waterGradient[2]} 100%)`,
                }}
              >
                <div className="absolute inset-0 opacity-30">
                  {[...Array(6)].map((_, i) => (
                    <LuWaves
                      key={i}
                      className="absolute text-white/40"
                      style={{
                        left: `${8 + i * 15}%`,
                        top: `${20 + (i % 3) * 18}%`,
                        width: 48 + (i % 2) * 16,
                        height: 48 + (i % 2) * 16,
                        animation: `pulse ${2 + i * 0.3}s ease-in-out infinite`,
                      }}
                    />
                  ))}
                </div>
                <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-amber-900/50 to-transparent" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
                  <div className="flex gap-2">
                    {['fish_blue', 'fish_green', 'fish_pink', 'fish_orange'].map((fish) => (
                      <img
                        key={fish}
                        src={`/games/fish/Vector/${fish}.svg`}
                        alt=""
                        className="h-10 w-10 drop-shadow-lg sm:h-12 sm:w-12"
                        style={{ animation: 'bounce 2s infinite' }}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/70">
                    {isDay ? t('play_earn_time_day') : t('play_earn_time_night')} · {t('play_earn_lobby_ready')}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-center">
                  <p className="text-[9px] font-bold uppercase text-white/40">{t('play_earn_fish_token')}</p>
                  <p className="font-mono text-lg font-black text-white">{wallet?.fishTokenBalance ?? 0}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-center">
                  <p className="text-[9px] font-bold uppercase text-white/40">Papel</p>
                  <p className="font-mono text-lg font-black text-amber-300">{wallet?.papelBalance ?? 0}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-center">
                  <p className="text-[9px] font-bold uppercase text-white/40">{t('play_earn_hud_time')}</p>
                  <p className="font-mono text-lg font-black text-white">{config?.sessionDurationSec ?? 90}s</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 p-4">
              {config && (
                <p className="text-center text-[11px] text-white/35">
                  {t('play_earn_rules', {
                    jeton: String(config.jetonPerPapel),
                    cap: String(config.dailyPapelCap),
                    sec: String(config.sessionDurationSec),
                  })}
                </p>
              )}

              {summary && (
                <div
                  className="rounded-xl border p-4 text-center text-sm"
                  style={{ borderColor: `${lobbyAccent}44`, background: `${lobbyAccent}11`, color: '#d1fae5' }}
                >
                  <LuFish className="mx-auto mb-1 h-5 w-5" style={{ color: lobbyAccent }} />
                  {t('play_earn_round_summary', { catches: String(summary.catches), tokens: String(summary.tokensEarned) })}
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-center text-sm text-red-200">{error}</div>
              )}

              <button
                type="button"
                onClick={startGame}
                disabled={starting || config?.gameEnabled === false}
                className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl py-5 text-base font-black uppercase tracking-[0.2em] text-white shadow-lg transition active:scale-[0.98] disabled:opacity-50"
                style={{
                  background: `linear-gradient(180deg, ${lobbyAccent} 0%, color-mix(in srgb, ${lobbyAccent} 55%, #1e1b4b) 100%)`,
                  boxShadow: `0 8px 32px ${lobbyAccent}44`,
                }}
              >
                <span className="absolute inset-0 translate-y-full bg-white/20 transition group-hover:translate-y-0" />
                <span className="relative flex items-center gap-2">
                  {starting ? <LuLoader className="h-6 w-6 animate-spin" /> : <LuPlay className="h-6 w-6 fill-current" />}
                  {t('play_earn_play')}
                </span>
              </button>

              <p className="flex items-center justify-center gap-1.5 text-[10px] text-white/30">
                {isDay ? <LuSun className="h-3 w-3" /> : <LuMoon className="h-3 w-3" />}
                {t('play_earn_auto_ambient_hint')}
              </p>
            </div>
          </div>
        )}
      </GameShell>

      {!loading && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center gap-2">
            <LuCoins className="h-4 w-4 text-amber-400" />
            <p className="text-sm font-bold text-white">{t('play_earn_convert_title')}</p>
          </div>
          <p className="text-xs text-white/40">
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
              className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/40"
            />
            <button
              type="button"
              onClick={handleConvert}
              disabled={converting}
              className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {converting ? '...' : t('play_earn_convert_btn')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
