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
  drawHudValue,
  normalizeFishSprite,
  type SceneBubble,
} from './fishScene';
import type { FishVisualTheme } from './fishTheme';
import { useT } from '@/contexts/LocaleContext';
import { clearSvgImageCache, preloadThemedSprites } from './svgAssets';

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

const FLOOR_RATIO = 0.16;

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

export default function FishingGame({ session, visualTheme, onEnd, onCancel }: Props) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fishRef = useRef<ActiveFish[]>(
    session.manifest.map((m) => ({ ...m, caught: false, spriteKey: normalizeFishSprite(m.sprite) })),
  );
  const startMsRef = useRef(Date.parse(session.startedAt));
  const [timeLeft, setTimeLeft] = useState(session.durationSec);
  const [sessionTokens, setSessionTokens] = useState(0);
  const [catchFlash, setCatchFlash] = useState<string | null>(null);
  const [assetsReady, setAssetsReady] = useState(false);
  const imagesRef = useRef<Record<string, HTMLImageElement>>({});
  const bubblesRef = useRef<SceneBubble[]>([]);
  const endedRef = useRef(false);
  const themeRef = useRef(visualTheme);
  themeRef.current = visualTheme;

  useEffect(() => {
    let cancelled = false;
    setAssetsReady(false);
    clearSvgImageCache();

    const entries = collectSceneSpriteEntries(session.manifest.map((m) => m.sprite));
    preloadThemedSprites(entries, visualTheme)
      .then((images) => {
        if (cancelled) return;
        imagesRef.current = images;
        setAssetsReady(true);
      })
      .catch(() => {
        if (!cancelled) setAssetsReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [session.manifest, visualTheme]);

  const finishSession = useCallback(async () => {
    if (endedRef.current) return;
    endedRef.current = true;
    try {
      const res = await fetchWithCreds(apiUrl('/api/member/play-earn/session/end'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.sessionId }),
      });
      const data = res.ok ? await res.json() : { tokensEarned: sessionTokens, catches: 0 };
      onEnd({ tokensEarned: data.tokensEarned ?? sessionTokens, catches: data.catches ?? 0 });
    } catch {
      onEnd({ tokensEarned: sessionTokens, catches: 0 });
    }
  }, [onEnd, session.sessionId, sessionTokens]);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startMsRef.current;
      const left = Math.max(0, session.durationSec - Math.floor(elapsed / 1000));
      setTimeLeft(left);
      if (left <= 0) finishSession();
    }, 250);
    return () => clearInterval(interval);
  }, [finishSession, session.durationSec]);

  useEffect(() => {
    if (!assetsReady) return undefined;
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

      if (bubblesRef.current.length === 0) {
        bubblesRef.current = createBubbles(18, h);
      }

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
        glow.addColorStop(0.4, 'rgba(180,210,255,0.08)');
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
        const y = plant.yRatio * playH;
        ctx.globalAlpha = plant.opacity * (theme.time === 'night' ? 0.75 : 1);
        drawProp(ctx, img, x, y, plant.width * scaleX, plant.height * scaleX);
        ctx.globalAlpha = 1;
      }

      SCENE_PARALLAX_ROCKS.forEach((sprite, i) => {
        const img = images[sprite];
        const pw = 110 * scaleX;
        const ph = 80 * scaleX;
        const x = i === 0 ? w * 0.04 : w - pw - w * 0.06;
        const y = playH * 0.22 + i * 28;
        ctx.globalAlpha = theme.time === 'night' ? 0.35 : 0.5;
        drawProp(ctx, img, x, y, pw, ph, i === 1);
        ctx.globalAlpha = 1;
      });

      for (const fish of fishRef.current) {
        if (fish.caught || elapsed < fish.spawnAtMs) continue;
        const fishDt = (elapsed - fish.spawnAtMs) / 1000;
        const x = fishDt * fish.speedPxPerSec * scaleX - 40;
        if (x > w + 60) continue;
        const y = laneH * (fish.lane + 1);
        const img = images[fish.spriteKey];
        const size = Math.max(36, fish.hitRadiusPx * 1.6);
        if (img?.complete) {
          ctx.drawImage(img, x, y - size / 2, size, size);
        } else {
          ctx.fillStyle = '#5eead4';
          ctx.beginPath();
          ctx.ellipse(x + size / 2, y, size / 2, size / 3, 0, 0, Math.PI * 2);
          ctx.fill();
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
        const x = prop.xRatio * w;
        const y = h - ph - floorH * 0.08;
        const sway = Math.sin(elapsed / 900 + prop.xRatio * 10) * 2;
        drawProp(ctx, img, x + sway, y, pw, ph, prop.flip);
      }

      for (const bubble of bubblesRef.current) {
        bubble.y -= bubble.speed * dt;
        bubble.wobble += dt * 2.5;
        if (bubble.y < playH * 0.05) {
          bubble.y = h - floorH - bubble.size;
          bubble.xRatio = 0.05 + Math.random() * 0.9;
        }
        const img = images[bubble.sprite];
        const bx = bubble.xRatio * w + Math.sin(bubble.wobble) * 8;
        const by = bubble.y;
        ctx.globalAlpha = theme.time === 'night' ? 0.7 : 0.55;
        drawProp(ctx, img, bx, by, bubble.size, bubble.size);
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
        ctx.fillStyle = 'rgba(94,234,212,0.22)';
        ctx.fillRect(0, 0, w, h);
      }

      const hudScale = Math.max(0.9, scaleX * 0.9);
      const hudY = 10;
      drawHudValue(ctx, images, String(timeLeft), 14, hudY, hudScale);
      drawHudValue(ctx, images, String(sessionTokens), 14, hudY + 22 * hudScale, hudScale);

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [assetsReady, catchFlash, sessionTokens, timeLeft]);

  const handleClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || endedRef.current || !assetsReady) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const elapsed = Date.now() - startMsRef.current;
    const scaleX = rect.width / SCREEN_WIDTH_PX;
    const floorH = rect.height * FLOOR_RATIO;
    const playH = rect.height - floorH;
    const laneH = playH / (LANE_COUNT + 1);

    let best: ActiveFish | null = null;
    let bestDist = Infinity;

    for (const fish of fishRef.current) {
      if (fish.caught || elapsed < fish.spawnAtMs || elapsed > fish.validUntilMs) continue;
      const fishDt = (elapsed - fish.spawnAtMs) / 1000;
      const fx = fishDt * fish.speedPxPerSec * scaleX;
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
        body: JSON.stringify({
          sessionId: session.sessionId,
          spawnId: best.spawnId,
          elapsedMs: elapsed,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) return;
      best.caught = true;
      setSessionTokens(data.sessionTokens ?? sessionTokens + data.tokens);
      setCatchFlash(best.spawnId);
      setTimeout(() => setCatchFlash(null), 120);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="relative h-full w-full min-h-[420px]">
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-crosshair touch-none"
        onClick={handleClick}
      />
      {!assetsReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#041018]/80 text-sm text-cyan-200">
          {t('play_earn_svg_loading')}
        </div>
      )}
      <button
        type="button"
        onClick={onCancel}
        className="absolute right-3 top-3 rounded-lg border border-white/20 bg-black/40 px-3 py-1.5 text-xs text-white/80 backdrop-blur hover:bg-black/60"
      >
        Çık
      </button>
    </div>
  );
}
