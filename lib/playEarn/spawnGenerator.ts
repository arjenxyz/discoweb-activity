import type { PlayEarnConfig, SpawnEntry } from './types';
import { FISH_TYPES, LANE_COUNT, SCREEN_WIDTH_PX } from './types';

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickFish(rand: () => number, phase: number): (typeof FISH_TYPES)[number] {
  const pool = FISH_TYPES.map((f) => ({
    ...f,
    weight: f.weight * (f.tokens <= 2 ? Math.max(0.35, 1 - phase * 0.12) : 1 + phase * 0.18),
  }));
  const total = pool.reduce((s, f) => s + f.weight, 0);
  let r = rand() * total;
  for (const fish of pool) {
    r -= fish.weight;
    if (r <= 0) return fish;
  }
  return pool[pool.length - 1];
}

export function generateSpawnManifest(
  config: PlayEarnConfig,
  sessionSeed: string,
): SpawnEntry[] {
  const rand = mulberry32(hashSeed(sessionSeed));
  const durationMs = config.session_duration_sec * 1000;
  const rampMs = config.difficulty_ramp_interval_sec * 1000;
  const spawns: SpawnEntry[] = [];
  let t = 400;
  let spawnIndex = 0;

  while (t < durationMs - 500) {
    const phase = Math.floor(t / rampMs);
    const speedMult = 1 + phase * (config.speed_ramp_percent / 100);
    const spawnMult = 1 + phase * (config.spawn_ramp_percent / 100);
    const baseInterval = 2200 / spawnMult;
    const fish = pickFish(rand, phase);
    const speedPxPerSec = (70 + fish.tokens * 8) * speedMult;
    const traverseMs = (SCREEN_WIDTH_PX / speedPxPerSec) * 1000;
    const hitRadiusPx = Math.max(22, 48 - phase * 4);
    const lane = Math.floor(rand() * LANE_COUNT);

    spawns.push({
      spawnId: `s${spawnIndex}`,
      fishType: fish.id,
      sprite: fish.sprite,
      lane,
      spawnAtMs: Math.round(t),
      speedPxPerSec: Math.round(speedPxPerSec * 10) / 10,
      tokenValue: fish.tokens,
      hitRadiusPx,
      validUntilMs: Math.round(t + traverseMs + 350),
    });

    spawnIndex += 1;
    t += baseInterval * (0.75 + rand() * 0.5);
  }

  return spawns;
}
