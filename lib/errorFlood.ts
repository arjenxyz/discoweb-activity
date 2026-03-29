/**
 * Flood detection — modül düzeyinde, circular dependency olmadan.
 * ErrorCollector ve GlobalErrorReporter her ikisi buradan import eder.
 */

const floodTimestamps: number[] = [];
const FLOOD_THRESHOLD = 5;
const FLOOD_WINDOW_MS = 60_000;

export function recordAndCheckFlood(): boolean {
  const now = Date.now();
  while (floodTimestamps.length > 0 && now - floodTimestamps[0] > FLOOD_WINDOW_MS) {
    floodTimestamps.shift();
  }
  floodTimestamps.push(now);
  return floodTimestamps.length >= FLOOD_THRESHOLD;
}
