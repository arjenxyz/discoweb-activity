'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { apiUrl } from '@/lib/api';
import type { SpawnEntry } from '@/lib/playEarn/types';
import { LANE_COUNT, SCREEN_WIDTH_PX } from '@/lib/playEarn/types';
import {
  SCENE_BACKDROP,
  SCENE_BOTTOM_PROPS,
  SCENE_PARALLAX_PLANTS,
  SCENE_PARALLAX_ROCKS,
  SCENE_SAND_TILES,
  collectSceneSpriteEntries,
  createBubbles,
  normalizeFishSprite,
  type SceneBubble,
} from './fishScene';
import { PERSONA_META, type FishVisualTheme } from './fishTheme';
import GameShell from './GameShell';
import { useT } from '@/contexts/LocaleContext';
import { clearSvgImageCache, preloadThemedSprites } from './svgAssets';
import { LuFish, LuTarget, LuTrophy, LuX } from 'react-icons/lu';

type SessionPayload = {
  sessionId: string;
  startedAt: string;
  durationSec: number;
  manifest: SpawnEntry[];
};

type Props = {
  session: SessionPayload;
  visualTheme: FishVisualTheme;
  onEnd: (summary: { tokensEarned: number; catches: number }) => void;
  onCancel: () => void;
};

type ActiveFish = SpawnEntry & { caught: boolean; spriteKey: string };
type CatchPopup = { id: number; x: number; y: number; tokens: number; born: number };
type GamePhase = 'loading' | 'countdown' | 'playing' | 'results';

const FLOOR_RATIO = 0.16;
const EMPTY_MANIFEST: SpawnEntry[] = [];

function drawProp(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | undefined,
  x: number,
  y: number,
  w: number,
  h: number,
  flip?: boolean,
) {
  if (!img?.complete) return;
  ctx.save();
  if (flip) {
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, w, h);
  } else {
    ctx.drawImage(img, x, y, w, h);
  }
  ctx.restore();
}

function toActiveFish(manifest: SpawnEntry[]): ActiveFish[] {
  return manifest.map((m) => ({
    ...m,
    caught: false,
    spriteKey: normalizeFishSprite(m.sprite ?? 'fish_blue.svg'),
  }));
}

export default function FishingGame({ session, visualTheme, onEnd, onCancel }: Props) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const manifest = Array.isArray(session.manifest) ? session.manifest : EMPTY_MANIFEST;
  const fishRef = useRef<ActiveFish[]>(toActiveFish(manifest));
  const startMsRef = useRef(
    Number.isFinite(Date.parse(session.startedAt ?? '')) ? Date.parse(session.startedAt) : Date.now(),
  );
  const popupIdRef = useRef(0);
  const endedRef = useRef(false);
  const themeRef = useRef(visualTheme);
  themeRef.current = visualTheme;

  const [phase, setPhase] = useState<GamePhase>('loading');
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(session.durationSec);
  const [sessionTokens, setSessionTokens] = useState(0);
  const [catchCount, setCatchCount] = useState(0);
  const [catchFlash, setCatchFlash] = useState(false);
  const [popups, setPopups] = useState<CatchPopup[]>([]);
  const [reticle, setReticle] = useState({ x: 0, y: 0, visible: false });
  const [results, setResults] = useState<{ tokensEarned: number; catches: number } | null>(null);
  const imagesRef = useRef<Record<string, HTMLImageElement>>({});
  const bubblesRef = useRef<SceneBubble[]>([]);

  const personaMeta = PERSONA_META[visualTheme?.persona ?? 'ocean'] ?? PERSONA_META.ocean;
  const accent = personaMeta.accent;
  const ambientLabel = t(personaMeta.labelKey);

  useEffect(() => {
    fishRef.current = toActiveFish(
      Array.isArray(session.manifest) ? session.manifest : EMPTY_MANIFEST,
    );
  }, [session.sessionId, session.manifest]);
  const timeLabel = visualTheme.time === 'day' ? t('play_earn_time_day') : t('play_earn_time_night');

  useEffect(() => {
    let cancelled = false;
    setPhase('loading');
    clearSvgImageCache();
    const entries = collectSceneSpriteEntries(manifest.map((m) => m.sprite).filter(Boolean));
    preloadThemedSprites(entries, visualTheme)
      .then((images) => {
        if (cancelled) return;
        imagesRef.current = images;
        setPhase('countdown');
        setCountdown(3);
      })
      .catch(() => {
        if (!cancelled) setPhase('countdown');
      });
    return () => { cancelled = true; };
  }, [manifest, session.sessionId, visualTheme]);

  useEffect(() => {
    if (phase !== 'countdown') return undefined;
    if (countdown > 0) {
      const id = setTimeout(() => setCountdown((c) => c - 1), 650);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setPhase('playing'), 550);
    return () => clearTimeout(id);
  }, [phase, countdown]);

  const finishSession = useCallback(async () => {
    if (endedRef.current) return;
    endedRef.current = true;
    try {
      const res = await fetchWithCreds(apiUrl('/api/member/play-earn/session/end'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.sessionId }),
      });
      const data = res.ok ? await res.json() : { tokensEarned: sessionTokens, catches: catchCount };
      setResults({
        tokensEarned: data.tokensEarned ?? sessionTokens,
        catches: data.catches ?? catchCount,
      });
      setPhase('results');
    } catch {
      setResults({ tokensEarned: sessionTokens, catches: catchCount });
      setPhase('results');
    }
  }, [catchCount, session.sessionId, sessionTokens]);

  useEffect(() => {
    if (phase !== 'playing') return undefined;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startMsRef.current;
      const left = Math.max(0, session.durationSec - Math.floor(elapsed / 1000));
      setTimeLeft(left);
      if (left <= 0) finishSession();
    }, 200);
    return () => clearInterval(interval);
  }, [finishSession, phase, session.durationSec]);

  useEffect(() => {
    if (phase !== 'playing' && phase !== 'countdown') return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let raf = 0;
    let lastFrame = performance.now();

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - lastFrame) / 1000);
      lastFrame = now;
      const theme = themeRef.current;

      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const w = rect.width;
      const h = rect.height;
      const elapsed = Date.now() - startMsRef.current;
      const scaleX = w / SCREEN_WIDTH_PX;
      const floorH = h * FLOOR_RATIO;
      const playH = h - floorH;
      const laneH = playH / (LANE_COUNT + 1);
      const images = imagesRef.current;

      if (bubblesRef.current.length === 0) bubblesRef.current = createBubbles(18, h);

      const [g0, g1, g2] = theme.waterGradient;
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, g0);
      grad.addColorStop(0.45, g1);
      grad.addColorStop(1, g2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      const terrain = images[SCENE_BACKDROP.terrain];
      if (terrain?.complete) {
        ctx.globalAlpha = theme.time === 'night' ? 0.55 : 0.88;
        ctx.drawImage(terrain, 0, 0, w, h);
        ctx.globalAlpha = 1;
      }

      if (theme.moonGlow) {
        const moonX = w * 0.82;
        const moonY = playH * 0.12;
        const moonR = Math.min(w, playH) * 0.07;
        const glow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonR * 4);
        glow.addColorStop(0, 'rgba(255,255,255,0.22)');
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, w, playH);
        ctx.fillStyle = 'rgba(245,248,255,0.9)';
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const plant of SCENE_PARALLAX_PLANTS) {
        const img = images[plant.sprite];
        if (!img?.complete) continue;
        const drift = ((elapsed / 1000) * plant.speed) % (w + plant.width);
        const x = ((plant.baseXRatio * w) - drift + w + plant.width) % (w + plant.width) - plant.width * 0.5;
        ctx.globalAlpha = plant.opacity * (theme.time === 'night' ? 0.75 : 1);
        drawProp(ctx, img, x, plant.yRatio * playH, plant.width * scaleX, plant.height * scaleX);
        ctx.globalAlpha = 1;
      }

      SCENE_PARALLAX_ROCKS.forEach((sprite, i) => {
        const img = images[sprite];
        const pw = 110 * scaleX;
        const ph = 80 * scaleX;
        drawProp(ctx, img, i === 0 ? w * 0.04 : w - pw - w * 0.06, playH * 0.22 + i * 28, pw, ph, i === 1);
      });

      if (phase === 'playing') {
        for (const fish of fishRef.current) {
          if (fish.caught || elapsed < fish.spawnAtMs) continue;
          const fishDt = (elapsed - fish.spawnAtMs) / 1000;
          const x = fishDt * fish.speedPxPerSec * scaleX - 40;
          if (x > w + 60) continue;
          const y = laneH * (fish.lane + 1);
          const img = images[fish.spriteKey];
          const size = Math.max(40, fish.hitRadiusPx * 1.75);
          if (img?.complete) {
            ctx.drawImage(img, x, y - size / 2, size, size);
          }
        }
      }

      const tileW = 48 * scaleX;
      const tileH = floorH * 0.55;
      const sandY = h - tileH;
      for (let tx = 0; tx < w + tileW; tx += tileW) {
        const tileSprite = SCENE_SAND_TILES[Math.floor(tx / tileW) % SCENE_SAND_TILES.length];
        drawProp(ctx, images[tileSprite], tx - ((elapsed / 40) % tileW), sandY, tileW, tileH);
      }
      ctx.fillStyle = theme.sandColor;
      ctx.fillRect(0, h - floorH * 0.35, w, floorH * 0.35);

      for (const prop of SCENE_BOTTOM_PROPS) {
        const img = images[prop.sprite];
        const pw = prop.width * scaleX;
        const ph = prop.height * scaleX;
        const sway = Math.sin(elapsed / 900 + prop.xRatio * 10) * 2;
        drawProp(ctx, img, prop.xRatio * w + sway, h - ph - floorH * 0.08, pw, ph, prop.flip);
      }

      for (const bubble of bubblesRef.current) {
        bubble.y -= bubble.speed * dt;
        bubble.wobble += dt * 2.5;
        if (bubble.y < playH * 0.05) {
          bubble.y = h - floorH - bubble.size;
          bubble.xRatio = 0.05 + Math.random() * 0.9;
        }
        ctx.globalAlpha = theme.time === 'night' ? 0.7 : 0.55;
        drawProp(ctx, images[bubble.sprite], bubble.xRatio * w + Math.sin(bubble.wobble) * 8, bubble.y, bubble.size, bubble.size);
        ctx.globalAlpha = 1;
      }

      const surface = images[SCENE_BACKDROP.surface];
      if (surface?.complete) {
        const surfH = Math.min(48 * scaleX, playH * 0.12);
        ctx.globalAlpha = theme.time === 'night' ? 0.65 : 0.85;
        ctx.drawImage(surface, 0, 0, w, surfH);
        ctx.globalAlpha = 1;
      }

      if (theme.vignette > 0) {
        const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.75);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, `rgba(0,0,0,${theme.vignette})`);
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, w, h);
      }

      if (catchFlash) {
        ctx.fillStyle = `${accent}33`;
        ctx.fillRect(0, 0, w, h);
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [accent, catchFlash, phase]);

  useEffect(() => {
    if (popups.length === 0) return undefined;
    const id = setInterval(() => {
      const now = Date.now();
      setPopups((prev) => prev.filter((p) => now - p.born < 900));
    }, 120);
    return () => clearInterval(id);
  }, [popups.length]);

  const tryCatch = async (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || endedRef.current || phase !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const elapsed = Date.now() - startMsRef.current;
    const scaleX = rect.width / SCREEN_WIDTH_PX;
    const floorH = rect.height * FLOOR_RATIO;
    const playH = rect.height - floorH;
    const laneH = playH / (LANE_COUNT + 1);

    let best: ActiveFish | null = null;
    let bestDist = Infinity;

    for (const fish of fishRef.current) {
      if (fish.caught || elapsed < fish.spawnAtMs || elapsed > fish.validUntilMs) continue;
      const fx = ((elapsed - fish.spawnAtMs) / 1000) * fish.speedPxPerSec * scaleX;
      const fy = laneH * (fish.lane + 1);
      const dist = Math.hypot(x - fx, y - fy);
      const hit = fish.hitRadiusPx * Math.max(0.65, scaleX);
      if (dist < hit && dist < bestDist) {
        best = fish;
        bestDist = dist;
      }
    }

    if (!best) return;

    try {
      const res = await fetchWithCreds(apiUrl('/api/member/play-earn/session/catch'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.sessionId, spawnId: best.spawnId, elapsedMs: elapsed }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) return;
      best.caught = true;
      const tokens = data.tokens ?? 0;
      setSessionTokens((prev) => data.sessionTokens ?? prev + tokens);
      setCatchCount((c) => c + 1);
      setCatchFlash(true);
      setTimeout(() => setCatchFlash(false), 100);
      popupIdRef.current += 1;
      setPopups((p) => [...p, { id: popupIdRef.current, x, y, tokens, born: Date.now() }]);
    } catch {
      /* ignore */
    }
  };

  const timerPct = Math.max(0, (timeLeft / session.durationSec) * 100);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#020a10]">
      <GameShell
        variant="play"
        title={t('play_earn_title')}
        subtitle={`${ambientLabel} · ${timeLabel}`}
        accent={accent}
      >
        <div className="relative aspect-[16/10] w-full min-h-[320px] sm:min-h-[420px]">
          <canvas
            ref={canvasRef}
            className="h-full w-full touch-none"
            style={{ cursor: phase === 'playing' ? 'none' : 'default' }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setReticle({ x: e.clientX - rect.left, y: e.clientY - rect.top, visible: phase === 'playing' });
            }}
            onMouseLeave={() => setReticle((r) => ({ ...r, visible: false }))}
            onClick={(e) => tryCatch(e.clientX, e.clientY)}
            onTouchEnd={(e) => {
              const touch = e.changedTouches[0];
              if (touch) tryCatch(touch.clientX, touch.clientY);
            }}
          />

          {/* HUD */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-3 sm:p-4">
            <div className="min-w-[120px] rounded-xl border border-white/15 bg-black/50 px-3 py-2 backdrop-blur-md">
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/45">{t('play_earn_hud_time')}</p>
              <p className="font-mono text-2xl font-black tabular-nums text-white">{timeLeft}</p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${timerPct}%`, background: `linear-gradient(90deg, ${accent}, #fff)` }}
                />
              </div>
            </div>
            <div
              className="rounded-xl border border-white/15 bg-black/50 px-4 py-2 text-center backdrop-blur-md"
              style={{ borderColor: `${accent}55` }}
            >
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/45">{t('play_earn_fish_token')}</p>
              <p className="flex items-center justify-center gap-1.5 font-mono text-2xl font-black text-white">
                <LuFish className="h-5 w-5" style={{ color: accent }} />
                {sessionTokens}
              </p>
            </div>
            <div className="min-w-[88px] rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-right backdrop-blur-md">
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/45">{t('play_earn_hud_catches')}</p>
              <p className="font-mono text-2xl font-black text-white">{catchCount}</p>
            </div>
          </div>

          {/* Nişangah */}
          {reticle.visible && phase === 'playing' && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: reticle.x, top: reticle.y }}
            >
              <LuTarget className="h-8 w-8 text-white/70 drop-shadow-[0_0_6px_rgba(0,0,0,0.8)]" style={{ color: accent }} />
            </div>
          )}

          {/* Yakalama popup */}
          {popups.map((p) => (
            <div
              key={p.id}
              className="pointer-events-none absolute z-20 -translate-x-1/2 animate-bounce font-black text-lg"
              style={{ left: p.x, top: p.y - 20, color: accent, textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
            >
              +{p.tokens}
            </div>
          ))}

          {/* Alt ipucu */}
          {phase === 'playing' && (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center">
              <span className="rounded-full border border-white/10 bg-black/40 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white/60 backdrop-blur">
                {t('play_earn_tap_hint')}
              </span>
            </div>
          )}

          {/* Yükleme */}
          {phase === 'loading' && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-[#041018]/90">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-cyan-400" />
              <p className="text-sm font-bold text-cyan-100">{t('play_earn_svg_loading')}</p>
            </div>
          )}

          {/* Geri sayım */}
          {phase === 'countdown' && countdown > 0 && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40">
              <span
                className="animate-pulse font-black text-white drop-shadow-lg"
                style={{ fontSize: 'clamp(4rem, 18vw, 7rem)', color: accent }}
              >
                {countdown}
              </span>
            </div>
          )}
          {phase === 'countdown' && countdown <= 0 && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30">
              <span className="text-5xl font-black uppercase tracking-widest text-white sm:text-6xl" style={{ color: accent }}>
                {t('play_earn_countdown_go')}
              </span>
            </div>
          )}

          {/* Sonuç ekranı */}
          {phase === 'results' && results && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
              <div
                className="w-full max-w-sm rounded-2xl border border-white/15 p-6 text-center shadow-2xl"
                style={{ background: `linear-gradient(160deg, ${accent}18, #061520 50%)` }}
              >
                <LuTrophy className="mx-auto h-10 w-10" style={{ color: accent }} />
                <h3 className="mt-3 text-xl font-black uppercase text-white">{t('play_earn_results_title')}</h3>
                <p className="mt-4 text-3xl font-black text-white">+{results.tokensEarned}</p>
                <p className="text-xs uppercase tracking-wider text-white/45">{t('play_earn_fish_token')}</p>
                <p className="mt-3 text-sm text-white/60">
                  {t('play_earn_round_summary', { catches: String(results.catches), tokens: String(results.tokensEarned) })}
                </p>
                <button
                  type="button"
                  onClick={() => onEnd(results)}
                  className="mt-6 w-full rounded-xl py-3 text-sm font-black uppercase tracking-wider text-white"
                  style={{ background: `linear-gradient(90deg, ${accent}, color-mix(in srgb, ${accent} 60%, #6366f1))` }}
                >
                  {t('play_earn_results_continue')}
                </button>
              </div>
            </div>
          )}
        </div>
      </GameShell>

      <button
        type="button"
        onClick={onCancel}
        className="absolute right-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white/80 backdrop-blur hover:bg-black/70"
        aria-label={t('play_earn_exit')}
      >
        <LuX className="h-4 w-4" />
      </button>
    </div>
  );
}
