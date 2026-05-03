'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { useT } from '@/contexts/LocaleContext';

type Obstacle = {
  x: number;
  width: number;
  height: number;
  type: 'pig' | 'bat' | 'rino';
  frame: number;
  frameTime: number;
  y: number;
  speedX: number;
  passed?: boolean;
};

const CANVAS_WIDTH = 920;
const CANVAS_HEIGHT = 300;
const GROUND_Y = 240;
const PLAYER_X = 96;
const PLAYER_WIDTH = 36;
const PLAYER_HEIGHT = 52;
const GRAVITY = 800;
const JUMP_VELOCITY = -300;
const BASE_SPEED = 120;
const MAX_SPEED = 540;
const DINO_FRAME_SIZE = 24;
const DINO_RUN_START_FRAME = 4;
const DINO_RUN_FRAMES = 6;
const DINO_FRAME_STEP = 0.1;
const PARALLAX_BASE_SPEED = 10;
const PARALLAX_MULTIPLIER = 1.4;

export default function PlayEarnSection() {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const parallaxRefs = useRef<Array<HTMLImageElement | null>>([null, null, null, null, null, null]);
  const parallaxOffsetsRef = useRef<number[]>([0, 0, 0, 0, 0, 0]);
  const dinoImageRef = useRef<HTMLImageElement | null>(null);
  const pigImageRef = useRef<HTMLImageElement | null>(null);
  const batImageRef = useRef<HTMLImageElement | null>(null);
  const rinoImageRef = useRef<HTMLImageElement | null>(null);
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const jumpSfxRef = useRef<HTMLAudioElement | null>(null);
  const hurtSfxRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const scoreRef = useRef(0);
  const velocityYRef = useRef(0);
  const playerYRef = useRef(GROUND_Y - PLAYER_HEIGHT);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const spawnTimerRef = useRef(0);
  const elapsedMsRef = useRef(0);
  const randSeedRef = useRef(123456789);
  const lastTimeRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(false);
  const [lives, setLives] = useState(5);
  const livesRef = useRef(5);
  const [gameOver, setGameOver] = useState(false);
  const [bestScore, setBestScore] = useState(0);
  const [award, setAward] = useState<number | null>(null);
  const [themeLabel, setThemeLabel] = useState<'supabase' | 'fallback'>('fallback');
  const runRef = useRef<{ runId: string; startedAt: string } | null>(null);
  const runFinishRequestedRef = useRef(false);
  const hitInvulnUntilRef = useRef(0);

  const currentSpeed = useMemo(() => Math.min(MAX_SPEED, BASE_SPEED + score * 0.12), [score]);

  const nextRand = () => {
    randSeedRef.current = (1664525 * randSeedRef.current + 1013904223) >>> 0;
    return randSeedRef.current / 4294967296;
  };

  const jump = () => {
    if (!runningRef.current) return;
    const onGround = playerYRef.current >= GROUND_Y - PLAYER_HEIGHT - 0.5;
    if (onGround) {
      velocityYRef.current = JUMP_VELOCITY;
      const sfx = jumpSfxRef.current;
      if (sfx) {
        sfx.currentTime = 0;
        void sfx.play().catch(() => {});
      }
    }
  };

  const resetGameState = () => {
    scoreRef.current = 0;
    velocityYRef.current = 0;
    playerYRef.current = GROUND_Y - PLAYER_HEIGHT;
    obstaclesRef.current = [];
    spawnTimerRef.current = 0;
    elapsedMsRef.current = 0;
    randSeedRef.current = (Date.now() % 2147483647) || 123456789;
    lastTimeRef.current = null;
    setScore(0);
    setLives(5);
    livesRef.current = 5;
    setGameOver(false);
    setAward(null);
    runFinishRequestedRef.current = false;
  };

  const stopLoop = () => {
    runningRef.current = false;
    setRunning(false);
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const p = parallaxRefs.current;
    const hasParallax = p.every(Boolean);
    if (hasParallax) {
      for (let i = 0; i < p.length; i += 1) {
        const img = p[i];
        if (!img) continue;
        const offset = parallaxOffsetsRef.current[i];
        const imgW = img.width;
        const imgH = img.height;
        const scaledH = CANVAS_HEIGHT;
        const scaledW = (imgW / Math.max(1, imgH)) * scaledH;
        let x = -offset;
        while (x < CANVAS_WIDTH) {
          ctx.drawImage(img, x, 0, scaledW, scaledH);
          x += scaledW;
        }
      }
    } else {
      const bg = backgroundImageRef.current;
      if (bg) {
        ctx.drawImage(bg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      } else {
        const grd = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        grd.addColorStop(0, '#0f172a');
        grd.addColorStop(1, '#111827');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
    }
    ctx.fillStyle = 'rgba(8,12,22,0.2)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
    ctx.stroke();

    const dinoImg = dinoImageRef.current;
    if (dinoImg) {
      const timeSec = elapsedMsRef.current / 1000;
      const frame = DINO_RUN_START_FRAME + (Math.floor(timeSec / DINO_FRAME_STEP) % DINO_RUN_FRAMES);
      ctx.drawImage(
        dinoImg,
        frame * DINO_FRAME_SIZE,
        0,
        DINO_FRAME_SIZE,
        DINO_FRAME_SIZE,
        PLAYER_X,
        playerYRef.current,
        PLAYER_WIDTH,
        PLAYER_HEIGHT,
      );
    } else {
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(PLAYER_X, playerYRef.current, PLAYER_WIDTH, PLAYER_HEIGHT);
    }

    for (const obs of obstaclesRef.current) {
      const y = obs.y;
      const source =
        obs.type === 'pig' ? pigImageRef.current :
          obs.type === 'bat' ? batImageRef.current :
            rinoImageRef.current;
      const frameW = obs.type === 'pig' ? 36 : obs.type === 'bat' ? 46 : 52;
      const frameH = obs.type === 'pig' ? 30 : obs.type === 'bat' ? 30 : 34;
      if (source) {
        ctx.drawImage(
          source,
          obs.frame * frameW,
          0,
          frameW,
          frameH,
          obs.x,
          y,
          obs.width,
          obs.height,
        );
      } else {
        ctx.fillStyle = '#f97316';
        ctx.fillRect(obs.x, y, obs.width, obs.height);
      }
    }

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`SCORE ${Math.floor(scoreRef.current)}`, 20, 34);
    ctx.fillText(`SPEED ${Math.floor(currentSpeed)}`, 20, 62);
    ctx.fillText(`LIVES ${lives}`, 20, 90);
  };

  const loop = (now: number) => {
    if (!runningRef.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    if (lastTimeRef.current === null) lastTimeRef.current = now;
    const dt = Math.min(0.032, (now - lastTimeRef.current) / 1000);
    lastTimeRef.current = now;

    const speedBoost = Math.min(2.2, 1 + scoreRef.current * 0.03);
    elapsedMsRef.current += dt * 1000;

    for (let i = 0; i < parallaxOffsetsRef.current.length; i += 1) {
      const layerSpeed = PARALLAX_BASE_SPEED * (PARALLAX_MULTIPLIER ** i);
      const img = parallaxRefs.current[i];
      if (!img) continue;
      const imgW = img.width;
      const imgH = img.height;
      const scaledW = (imgW / Math.max(1, imgH)) * CANVAS_HEIGHT;
      parallaxOffsetsRef.current[i] = (parallaxOffsetsRef.current[i] + (layerSpeed * dt)) % Math.max(1, scaledW);
    }
    scoreRef.current += dt * 100;
    setScore(Math.floor(scoreRef.current));

    velocityYRef.current += GRAVITY * dt;
    playerYRef.current += velocityYRef.current * dt;
    if (playerYRef.current > GROUND_Y - PLAYER_HEIGHT) {
      playerYRef.current = GROUND_Y - PLAYER_HEIGHT;
      velocityYRef.current = 0;
    }

    spawnTimerRef.current -= dt;
    if (spawnTimerRef.current <= 0) {
      const roll = nextRand();
      const type: Obstacle['type'] = roll < 0.34 ? 'pig' : roll < 0.67 ? 'bat' : 'rino';
      const conf = type === 'pig'
        ? { w: 40 * 0.6, h: 34 * 0.6, y: GROUND_Y - (34 * 0.6), speedX: 80 }
        : type === 'bat'
          ? { w: 46 * 0.6, h: 30 * 0.6, y: GROUND_Y - (30 * 0.6) - (nextRand() * 36), speedX: 100 }
          : { w: 52 * 0.6, h: 34 * 0.6, y: GROUND_Y - (34 * 0.6), speedX: 150 };
      obstaclesRef.current.push({
        x: CANVAS_WIDTH + 10,
        width: conf.w,
        height: conf.h,
        type,
        frame: 0,
        frameTime: 0,
        y: conf.y,
        speedX: conf.speedX,
      });
      const spawnInterval = Math.max(0.7, 2 - scoreRef.current * 0.04);
      spawnTimerRef.current = spawnInterval;
    }

    obstaclesRef.current = obstaclesRef.current
      .map((obs) => {
        const nextFrameTime = obs.frameTime + dt;
        const frameCount = obs.type === 'pig' ? 16 : obs.type === 'bat' ? 7 : 6;
        const frameStep = obs.type === 'rino' ? 0.09 : 0.1;
        const nextFrame = nextFrameTime >= frameStep ? (obs.frame + 1) % frameCount : obs.frame;
        return {
          ...obs,
          x: obs.x - Math.min(MAX_SPEED, obs.speedX * speedBoost) * dt,
          frame: nextFrame,
          frameTime: nextFrameTime >= frameStep ? 0 : nextFrameTime,
        };
      })
      .filter((obs) => obs.x + obs.width > -20);

    for (const obs of obstaclesRef.current) {
      if ((obs.x + obs.width) < PLAYER_X && !obs.passed) {
        obs.passed = true;
        scoreRef.current += 1;
        setScore(Math.floor(scoreRef.current));
      }
    }

    const playerTop = playerYRef.current;
    const hit = obstaclesRef.current.some((obs) => {
      const obsTop = obs.y;
      const obsBottom = obs.y + obs.height;
      const obsRight = obs.x + obs.width;
      const px = PLAYER_X + (PLAYER_WIDTH * 0.25); // Flutter: width 0.5, x offset 0.25
      const pw = PLAYER_WIDTH * 0.5;
      const py = playerTop + (PLAYER_HEIGHT * 0.15); // Flutter: height 0.7, y offset 0.15
      const ph = PLAYER_HEIGHT * 0.7;
      return px < obsRight && (px + pw) > obs.x && py < obsBottom && (py + ph) > obsTop;
    });

    if (hit && elapsedMsRef.current > hitInvulnUntilRef.current) {
      hitInvulnUntilRef.current = elapsedMsRef.current + 1000;
      const hurt = hurtSfxRef.current;
      if (hurt) {
        hurt.currentTime = 0;
        void hurt.play().catch(() => {});
      }
      const remainingLives = Math.max(0, livesRef.current - 1);
      livesRef.current = remainingLives;
      setLives(remainingLives);
      if (remainingLives > 0) {
        draw(ctx);
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      const finalScore = Math.floor(scoreRef.current);
      const durationMs = Math.max(1, Math.floor(elapsedMsRef.current));
      const obstaclesPassed = Math.floor(scoreRef.current);
      setGameOver(true);
      setBestScore((prev) => Math.max(prev, finalScore));
      stopLoop();
      draw(ctx);
      if (!runFinishRequestedRef.current && runRef.current?.runId) {
        runFinishRequestedRef.current = true;
        void fetch('/api/member/game-run/finish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runId: runRef.current.runId,
            score: finalScore,
            durationMs,
            obstaclesPassed,
          }),
        }).then(async (res) => {
          const data = await res.json().catch(() => ({})) as { awardedPapel?: number };
          if (res.ok) setAward(Number(data.awardedPapel ?? 0));
          else setAward(0);
        }).catch(() => setAward(0));
      }
      return;
    }

    draw(ctx);
    rafRef.current = requestAnimationFrame(loop);
  };

  const startGame = async () => {
    resetGameState();
    const runResponse = await fetch('/api/member/game-run/start', { method: 'POST' });
    if (runResponse.ok) {
      const runData = await runResponse.json().catch(() => ({})) as { runId?: string; startedAt?: string };
      if (runData.runId && runData.startedAt) {
        runRef.current = { runId: runData.runId, startedAt: runData.startedAt };
      } else {
        runRef.current = null;
      }
    } else {
      runRef.current = null;
    }
    runningRef.current = true;
    setRunning(true);
    const bgm = bgmRef.current;
    if (bgm) {
      bgm.currentTime = 0;
      bgm.loop = true;
      bgm.volume = 0.35;
      void bgm.play().catch(() => {});
    }
    rafRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (!runningRef.current && !gameOver) void startGame();
        jump();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      stopLoop();
      const bgm = bgmRef.current;
      if (bgm) bgm.pause();
    };
  }, [gameOver]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) draw(ctx);
  }, []);

  useEffect(() => {
    let mounted = true;
    void fetch('/api/member/game-theme', { cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({})) as { imageUrl?: string; source?: 'supabase' | 'fallback' };
        if (!mounted) return;
        const url = data.imageUrl || '/menu-background/varyant3.jpg';
        const img = new Image();
        img.onload = () => {
          backgroundImageRef.current = img;
          const ctx = canvasRef.current?.getContext('2d');
          if (ctx) draw(ctx);
        };
        img.src = url;
        setThemeLabel(data.source === 'supabase' ? 'supabase' : 'fallback');
      })
      .catch(() => {
        setThemeLabel('fallback');
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const load = (src: string, ref: MutableRefObject<HTMLImageElement | null>) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          ref.current = img;
          resolve();
        };
        img.onerror = () => resolve();
        img.src = src;
      });

    void Promise.all([
      load('/games/dino/dino.png', dinoImageRef),
      load('/games/dino/pig.png', pigImageRef),
      load('/games/dino/bat.png', batImageRef),
      load('/games/dino/rino.png', rinoImageRef),
    ]).then(() => {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) draw(ctx);
    });
  }, []);

  useEffect(() => {
    const load = (src: string, idx: number) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          parallaxRefs.current[idx] = img;
          resolve();
        };
        img.onerror = () => resolve();
        img.src = src;
      });
    void Promise.all([
      load('/games/dino/parallax/plx-1.png', 0),
      load('/games/dino/parallax/plx-2.png', 1),
      load('/games/dino/parallax/plx-3.png', 2),
      load('/games/dino/parallax/plx-4.png', 3),
      load('/games/dino/parallax/plx-5.png', 4),
      load('/games/dino/parallax/plx-6.png', 5),
    ]).then(() => {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) draw(ctx);
    });
  }, []);

  useEffect(() => {
    bgmRef.current = new Audio('/games/dino/audio/8BitPlatformerLoop.wav');
    jumpSfxRef.current = new Audio('/games/dino/audio/jump14.wav');
    hurtSfxRef.current = new Audio('/games/dino/audio/hurt7.wav');
    return () => {
      bgmRef.current?.pause();
      bgmRef.current = null;
      jumpSfxRef.current = null;
      hurtSfxRef.current = null;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-40 bg-[#05070d] p-0">
      <section className="h-full w-full border border-white/10 bg-[#0b0d12]/95 p-3 sm:p-4 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-white">{t('play_earn_title')}</h2>
            <p className="text-sm text-white/60">{t('play_earn_subtitle')}</p>
          </div>
          <div className="text-right text-xs text-white/55">
            <p>{t('play_earn_score')}: <span className="font-semibold text-white">{score}</span></p>
            <p>{t('play_earn_best')}: <span className="font-semibold text-white">{bestScore}</span></p>
            <p>Lives: <span className="font-semibold text-white">{lives}</span></p>
            <p>{t('play_earn_theme')}: <span className="font-semibold text-white">{themeLabel}</span></p>
          </div>
        </div>

        <div className="h-[calc(100vh-180px)] overflow-hidden rounded-2xl border border-white/10 bg-black/30">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="h-full w-full"
            aria-label="Dino Play Earn"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {!running && (
            <button
              type="button"
              onClick={() => { void startGame(); }}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
            >
              {gameOver ? t('play_earn_restart') : t('play_earn_start')}
            </button>
          )}
          <button
            type="button"
            onClick={jump}
            disabled={!running}
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('play_earn_jump')}
          </button>
          <p className="text-xs text-white/55">{t('play_earn_hint')}</p>
          {gameOver && award !== null && (
            <p className="text-xs font-semibold text-emerald-300">
              {t('play_earn_award', { amount: award })}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
