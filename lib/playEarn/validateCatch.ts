import type { SpawnEntry } from './types';

export type CatchValidationResult =
  | { ok: true; entry: SpawnEntry }
  | { ok: false; reason: string };

export function validateCatch(
  manifest: SpawnEntry[],
  caughtIds: string[],
  spawnId: string,
  elapsedMs: number,
  lastCatchAt: Date | null,
): CatchValidationResult {
  if (caughtIds.includes(spawnId)) {
    return { ok: false, reason: 'already_caught' };
  }

  const entry = manifest.find((s) => s.spawnId === spawnId);
  if (!entry) {
    return { ok: false, reason: 'unknown_spawn' };
  }

  if (elapsedMs < entry.spawnAtMs - 120) {
    return { ok: false, reason: 'too_early' };
  }

  if (elapsedMs > entry.validUntilMs + 150) {
    return { ok: false, reason: 'too_late' };
  }

  if (lastCatchAt) {
    const sinceLast = Date.now() - lastCatchAt.getTime();
    if (sinceLast < 180) {
      return { ok: false, reason: 'rate_limited' };
    }
  }

  return { ok: true, entry };
}
