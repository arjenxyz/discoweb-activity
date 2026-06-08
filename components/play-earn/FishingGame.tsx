'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { apiUrl } from '@/lib/api';
import type { SpawnEntry } from '@/lib/playEarn/types';
import { SCREEN_WIDTH_PX } from '@/lib/playEarn/types';

type SessionPayload = {
  sessionId: string;
  startedAt: string;
  durationSec: number;
  manifest: SpawnEntry[];
};

type Props = {
  session: SessionPayload;
  onEnd: (summary: { tokensEarned: number; catches: number }) => void;
  onCancel: () => void;
};

type ActiveFish = SpawnEntry & { caught: boolean };

const fishAsset = (file: string) => {
  if (typeof window !== 'undefined' && (window.location.hostname.includes('discordsays.com') || window.location.hostname.includes('discordapp.com'))) {
    return `/activity/games/fish/${file}`;
  }
  return `/games/fish/${file}`;
};

export default function FishingGame({ session, onEnd, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fishRef = useRef<ActiveFish[]>(session.manifest.map((m) => ({ ...m, caught: false })));
  const startMsRef = useRef(Date.parse(session.startedAt));
  const [timeLeft, setTimeLeft] = useState(session.durationSec);
  const [sessionTokens, setSessionTokens] = useState(0);
  const [catchFlash, setCatchFlash] = useState<string | null>(null);
  const imagesRef = useRef<Record<string, HTMLImageElement>>({});
  const bgRef = useRef<HTMLImageElement | null>(null);
  const endedRef = useRef(false);

  useEffect(() => {
    const sprites = new Set(session.manifest.map((m) => m.sprite));
    sprites.forEach((sprite) => {
      const img = new Image();
      img.src = fishAsset(sprite);
      imagesRef.current[sprite] = img;
    });
    const bg = new Image();
    bg.src = fishAsset('background_terrain.png');
    bgRef.current = bg;
  }, [session.manifest]);

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
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let raf = 0;
    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const w = rect.width;
      const h = rect.height;
      const elapsed = Date.now() - startMsRef.current;
      const scaleX = w / SCREEN_WIDTH_PX;
      const laneH = h / 5;

      if (bgRef.current?.complete) {
        ctx.drawImage(bgRef.current, 0, 0, w, h);
      } else {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#0a3d62');
        grad.addColorStop(1, '#06283d');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = 'bold 18px system-ui';
      ctx.fillText(`⏱ ${timeLeft}s`, 16, 28);
      ctx.fillText(`🪙 ${sessionTokens} jeton`, 16, 52);

      for (const fish of fishRef.current) {
        if (fish.caught || elapsed < fish.spawnAtMs) continue;
        const dt = (elapsed - fish.spawnAtMs) / 1000;
        const x = dt * fish.speedPxPerSec * scaleX - 40;
        if (x > w + 60) continue;
        const y = laneH * (fish.lane + 1);
        const img = imagesRef.current[fish.sprite];
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

      if (catchFlash) {
        ctx.fillStyle = 'rgba(94,234,212,0.25)';
        ctx.fillRect(0, 0, w, h);
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [catchFlash, sessionTokens, timeLeft]);

  const handleClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || endedRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const elapsed = Date.now() - startMsRef.current;
    const scaleX = rect.width / SCREEN_WIDTH_PX;
    const laneH = rect.height / 5;

    let best: ActiveFish | null = null;
    let bestDist = Infinity;

    for (const fish of fishRef.current) {
      if (fish.caught || elapsed < fish.spawnAtMs || elapsed > fish.validUntilMs) continue;
      const dt = (elapsed - fish.spawnAtMs) / 1000;
      const fx = dt * fish.speedPxPerSec * scaleX;
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
