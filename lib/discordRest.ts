const DISCORD_FETCH_TIMEOUT_MS = 10_000; // 10 saniye

export async function discordFetch(
  url: string,
  init?: RequestInit,
  opts?: { retries?: number; backoff?: number; timeoutMs?: number },
) {
  const retries = opts?.retries ?? 3;
  const backoff = opts?.backoff ?? 500;
  const timeoutMs = opts?.timeoutMs ?? DISCORD_FETCH_TIMEOUT_MS;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { ...(init as object), signal: controller.signal } as RequestInit);
      clearTimeout(timeoutId);

      // Handle rate limits (429)
      if (res.status === 429) {
        const ra = res.headers.get('retry-after');
        const wait = ra ? Number(ra) * 1000 : backoff * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, Math.min(wait, 60000)));
        if (attempt === retries) return res;
        continue;
      }

      // Retry on server errors
      if (res.status >= 500 && attempt < retries) {
        await new Promise((r) => setTimeout(r, backoff * Math.pow(2, attempt)));
        continue;
      }

      return res;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        if (attempt === retries) throw new Error(`Discord API timeout (${timeoutMs}ms): ${url}`);
        await new Promise((r) => setTimeout(r, backoff * Math.pow(2, attempt)));
        continue;
      }
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, backoff * Math.pow(2, attempt)));
    }
  }

  throw new Error('discordFetch: unreachable');
}
