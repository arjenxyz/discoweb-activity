export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export function apiUrl(path: string): string {
  if (!path) return API_BASE_URL;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  // Discord Activity iframe runs under a proxy origin like `*.discordsays.com`.
  // That origin enforces a strict CSP, so cross-origin fetches (to our real
  // domain) are blocked. In that case, we must keep the request relative so
  // it goes through the proxy. We also need to avoid leading `/` because the
  // proxy likely only forwards within the activity route (e.g. `/activity/...`).
  if (typeof window !== 'undefined' && window.location.hostname.includes('discordsays.com')) {
    // Proxy may serve the activity under an `/activity` prefix. Ensure requests
    // go to the activity-scoped path so the proxy will forward them to our
    // backend. Use a conservative prefix to avoid relying on the current
    // pathname which can be `/` in some proxy configurations.
    const cleaned = path.replace(/^\/+/, '');
    return `activity/${cleaned}`;
  }

  const normalizedBase = API_BASE_URL.replace(/\/+$/, '');
  const normalizedPath = path.replace(/^\/+/, '');

  if (!normalizedBase) return `/${normalizedPath}`;
  return `${normalizedBase}/${normalizedPath}`;
}
