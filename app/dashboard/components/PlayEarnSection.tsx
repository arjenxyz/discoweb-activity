'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { apiUrl } from '@/lib/api';
import FishingGame from '@/components/play-earn/FishingGame';
import {
  PERSONA_META,
  resolveAutoVisualTheme,
  resolveTimeOfDay,
} from '@/components/play-earn/fishTheme';
import type { SpawnEntry } from '@/lib/playEarn/types';
import { gameAssetUrl } from '@/lib/gameAssets';
import { useT } from '@/contexts/LocaleContext';
import { LuFish, LuLoader, LuMoon, LuPlay, LuSun, LuWaves } from 'react-icons/lu';

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

const FISH_PREVIEW = ['fish_blue', 'fish_green', 'fish_pink', 'fish_orange'] as const;

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
  const [showConvert, setShowConvert] = useState(false);

  const lobbyTheme = useMemo(() => resolveAutoVisualTheme('lobby-preview'), []);
  const sessionTheme = useMemo(
    () => (session ? resolveAutoVisualTheme(session.sessionId) : lobbyTheme),
    [session, lobbyTheme],
  );
  const accent = PERSONA_META[lobbyTheme.persona].accent;
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
      if (!data?.sessionId || !Array.isArray(data.manifest)) {
        setError(t('play_earn_start_failed'));
        return;
      }
      setSession({
        sessionId: String(data.sessionId),
        startedAt: String(data.startedAt ?? new Date().toISOString()),
        durationSec: Number(data.durationSec) || 90,
        manifest: data.manifest as SpawnEntry[],
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
      setShowConvert(false);
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
    <section className="relative flex h-full min-h-0 w-full flex-1">
      <div
        className="relative h-full min-h-0 w-full flex-1 overflow-hidden"
        style={{
          background: `linear-gradient(180deg, ${lobbyTheme.waterGradient[0]} 0%, ${lobbyTheme.waterGradient[1]} 45%, ${lobbyTheme.waterGradient[2]} 100%)`,
        }}
      >
        {/* scanline */}
        <div
          className="pointer-events-none absolute inset-0 z-[1] opacity-[0.035]"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 3px)',
          }}
        />

        {/* dekor dalgalar */}
        <div className="pointer-events-none absolute inset-0 z-[2] opacity-25">
          {[
            { left: '6%', top: '12%', size: 56 },
            { left: '22%', top: '38%', size: 44 },
            { left: '48%', top: '8%', size: 64 },
            { left: '72%', top: '28%', size: 52 },
            { left: '84%', top: '52%', size: 40 },
            { left: '38%', top: '62%', size: 48 },
          ].map((w, i) => (
            <LuWaves
              key={i}
              className="absolute text-white"
              style={{
                left: w.left,
                top: w.top,
                width: w.size,
                height: w.size,
                animation: `pulse ${2.2 + i * 0.25}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>

        {/* kum / derinlik */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-1/3 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />

        {loading ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center">
            <LuLoader className="h-10 w-10 animate-spin text-white/80" />
          </div>
        ) : (
          <>
            {/* Üst bilgi şeridi */}
            <div className="absolute inset-x-0 top-0 z-20 flex flex-wrap items-start justify-between gap-2 p-3 sm:p-4">
              <div className="flex flex-wrap gap-2">
                <div className="rounded-xl border border-white/15 bg-black/35 px-3 py-2 backdrop-blur-md">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-white/45">{t('play_earn_fish_token')}</p>
                  <p className="font-mono text-xl font-black text-white">{wallet?.fishTokenBalance ?? 0}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConvert((v) => !v)}
                  className="rounded-xl border border-white/15 bg-black/35 px-3 py-2 text-left backdrop-blur-md transition hover:bg-black/45"
                >
                  <p className="text-[9px] font-bold uppercase tracking-wider text-white/45">Papel</p>
                  <p className="font-mono text-xl font-black text-amber-300">{wallet?.papelBalance ?? 0}</p>
                </button>
                <div className="rounded-xl border border-white/15 bg-black/35 px-3 py-2 backdrop-blur-md">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-white/45">{t('play_earn_hud_time')}</p>
                  <p className="font-mono text-xl font-black text-white">{config?.sessionDurationSec ?? 90}s</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/35 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/70 backdrop-blur-md">
                {isDay ? <LuSun className="h-3.5 w-3.5 text-amber-300" /> : <LuMoon className="h-3.5 w-3.5 text-indigo-300" />}
                {isDay ? t('play_earn_time_day') : t('play_earn_time_night')}
              </div>
            </div>

            {/* Orta — balıklar */}
            <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-4">
              <div className="flex items-end gap-3 sm:gap-5">
                {FISH_PREVIEW.map((fish, i) => (
                  <img
                    key={fish}
                    src={gameAssetUrl(`fish/Vector/${fish}.svg`)}
                    alt=""
                    className="drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)]"
                    style={{
                      width: 56 + (i % 2) * 12,
                      height: 56 + (i % 2) * 12,
                      animation: `bounce ${1.8 + i * 0.15}s ease-in-out infinite`,
                    }}
                  />
                ))}
              </div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-white/75 sm:text-sm">
                {isDay ? t('play_earn_time_day') : t('play_earn_time_night')} · {t('play_earn_lobby_ready')}
              </p>
            </div>

            {/* Alt — kurallar, hata, oyna */}
            <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-3 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-8">
              {config && (
                <p className="max-w-md text-center text-[10px] leading-relaxed text-white/50 sm:text-[11px]">
                  {t('play_earn_rules', {
                    jeton: String(config.jetonPerPapel),
                    cap: String(config.dailyPapelCap),
                    sec: String(config.sessionDurationSec),
                  })}
                  {' · '}
                  {t('play_earn_convert_hint', {
                    min: String(wallet?.minConvertJeton ?? 100),
                    remaining: String(wallet?.remainingPapelCap ?? 0),
                  })}
                </p>
              )}

              {summary && (
                <div
                  className="w-full max-w-md rounded-xl border px-4 py-3 text-center text-sm backdrop-blur-md"
                  style={{ borderColor: `${accent}55`, background: `${accent}22`, color: '#ecfdf5' }}
                >
                  <LuFish className="mx-auto mb-1 h-5 w-5" style={{ color: accent }} />
                  {t('play_earn_round_summary', { catches: String(summary.catches), tokens: String(summary.tokensEarned) })}
                </div>
              )}

              {error && (
                <div className="w-full max-w-md rounded-xl border border-red-400/30 bg-red-950/60 px-4 py-2.5 text-center text-sm text-red-100 backdrop-blur-md">
                  {error}
                </div>
              )}

              {showConvert && (
                <div className="flex w-full max-w-md gap-2 rounded-xl border border-white/15 bg-black/45 p-2 backdrop-blur-md">
                  <input
                    type="number"
                    min={1}
                    value={convertAmount}
                    onChange={(e) => setConvertAmount(e.target.value)}
                    placeholder={t('play_earn_convert_placeholder')}
                    className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400/40"
                  />
                  <button
                    type="button"
                    onClick={handleConvert}
                    disabled={converting}
                    className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {converting ? '...' : t('play_earn_convert_btn')}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={startGame}
                disabled={starting || config?.gameEnabled === false}
                className="group relative flex w-full max-w-md items-center justify-center gap-3 overflow-hidden rounded-2xl py-5 text-lg font-black uppercase tracking-[0.22em] text-white shadow-2xl transition active:scale-[0.98] disabled:opacity-50"
                style={{
                  background: `linear-gradient(180deg, ${accent} 0%, color-mix(in srgb, ${accent} 50%, #0f172a) 100%)`,
                  boxShadow: `0 12px 40px ${accent}55, inset 0 1px 0 rgba(255,255,255,0.25)`,
                }}
              >
                <span className="absolute inset-0 translate-y-full bg-white/15 transition duration-300 group-hover:translate-y-0" />
                <span className="relative flex items-center gap-2.5">
                  {starting ? <LuLoader className="h-7 w-7 animate-spin" /> : <LuPlay className="h-7 w-7 fill-current" />}
                  {t('play_earn_play')}
                </span>
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
